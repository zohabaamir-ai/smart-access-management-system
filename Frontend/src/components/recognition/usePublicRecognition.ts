import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { RefObject } from 'react'

import {
  recognizeAtCamera,
  sendCameraHeartbeat,
  RecognitionError,
} from '../../services/recognitionService'
import { startRecognitionSession } from '../../context/cameras/cameraSessions'

import {
  captureJpegFrame,
  frameDelta,
  frameSignature,
} from './frameCapture'

import type {
  PublicRecognitionPhase,
  RecognitionOutcome,
} from './types'

/* =============================================================
   usePublicRecognition

   The public recognition station state machine
   (/recognition/camera/:slug).

   Deliberate cadence:

     starting
        -> scanning ("Waiting for a face…", NO recognition calls)
        -> a face / scene change appears
        -> checking ("Recognizing…", scan-line animation, ONE call)
        -> result overlay (matched / no match / …)
        -> short cooldown (result_hold) or watching (matched)
        -> re-baseline the quiet scene
        -> scanning again

   AUTO mode does NOT poll: while "scanning" it samples only a
   coarse 32x24 greyscale frame signature (cheap, local, no
   inference) and fires the real recognition request only when
   the scene changes past ENTER_DELTA vs. the quiet baseline —
   i.e. someone stepped up. One priming call is made right after
   the camera opens so a person already standing there is caught.
   The same continuously-present face is not re-recognised until
   the scene changes again.

   MANUAL mode: `recognizeNow()` runs exactly one flow per press;
   it never auto-repeats.

   Auto vs Manual is a camera-level backend setting
   (cameras.auto_recognition), passed in as `auto` — the same on
   every device that opens this camera.

   Session presence (heartbeat to backend + localStorage
   fallback) is independent of recognition activity and is not
   changed here.
============================================================= */

// Backend camera-session TTL is 20s (CAMERA_SESSION_TTL_SECONDS);
// beat comfortably inside it.
const BACKEND_HEARTBEAT_MS = 8000

// Minimum gap between two auto recognition attempts.
const AUTO_MIN_GAP_MS = 2500

const HOLD_MS: Record<string, number> = {
  no_face: 1400,
  multi_face: 2200,
  no_match: 2800,
  error: 2500,
}

const MATCH_MIN_DISPLAY_MS = 2500
const WATCH_CAP_MS = 45_000
// Coarse scene-change thresholds (normalised mean abs pixel diff).
const LEFT_DELTA = 0.12 // matched person likely left -> resume
const ENTER_DELTA = 0.12 // scene changed vs quiet -> someone stepped up
const TICK_MS = 400

type Options = {
  slug: string
  videoRef: RefObject<HTMLVideoElement | null>
  // camera stream is ready (video has dimensions)
  ready: boolean
  // camera-level recognition mode (backend cameras.auto_recognition)
  auto: boolean
  onUnavailable?: (message: string) => void
}

export function usePublicRecognition({
  slug,
  videoRef,
  ready,
  auto,
  onUnavailable,
}: Options) {
  const canvasRef =
    useRef<HTMLCanvasElement>(null)
  const sigCanvasRef =
    useRef<HTMLCanvasElement>(null)

  const [phase, setPhaseState] =
    useState<PublicRecognitionPhase>(
      'starting',
    )
  const [outcome, setOutcome] =
    useState<RecognitionOutcome>({
      kind: 'idle',
    })

  const phaseRef = useRef(phase)
  const autoRef = useRef(auto)
  // earliest time the next auto attempt may fire (cooldown floor)
  const armedAtRef = useRef(0)
  const holdUntilRef = useRef(0)
  const watchStartedRef = useRef(0)
  const watchCapAtRef = useRef(0)
  const matchSigRef =
    useRef<Uint8Array | null>(null)
  // quiet-scene fingerprint the auto gate compares against
  const baselineSigRef =
    useRef<Uint8Array | null>(null)
  // one ungated recognition right after the camera opens
  const primedRef = useRef(false)

  useEffect(() => {
    autoRef.current = auto
    // entering Auto (on open, or a mid-session switch) re-arms the
    // one ungated "priming" recognition so a person already in front
    // of the camera is picked up
    if (auto) {
      primedRef.current = false
    }
  }, [auto])

  // heartbeat the public session while the stream is live — to the
  // backend (cross-device ONLINE) and to localStorage (same-browser
  // fallback). Both stop when the page / stream goes away.
  useEffect(() => {
    if (!ready) return

    const stopLocal = startRecognitionSession(slug)

    const beat = () => {
      void sendCameraHeartbeat(slug).catch(() => {
        /* best-effort — the interval retries */
      })
    }
    beat()
    const id = window.setInterval(
      beat,
      BACKEND_HEARTBEAT_MS,
    )

    return () => {
      window.clearInterval(id)
      stopLocal()
    }
  }, [ready, slug])

  const setPhase = useCallback(
    (next: PublicRecognitionPhase) => {
      phaseRef.current = next
      setPhaseState(next)
    },
    [],
  )

  // Return to the calm waiting state: snapshot the (now quiet)
  // scene as the new baseline so a still-present person is not
  // recognised again, and start a fresh cooldown.
  const resumeWaiting = useCallback(
    (cooldownMs: number) => {
      baselineSigRef.current = frameSignature(
        videoRef.current,
        sigCanvasRef.current,
      )
      primedRef.current = true
      armedAtRef.current =
        Date.now() + cooldownMs
      setPhase('scanning')
    },
    [setPhase, videoRef],
  )

  const enterHold = useCallback(
    (kind: keyof typeof HOLD_MS) => {
      holdUntilRef.current =
        Date.now() + (HOLD_MS[kind] ?? 2000)
      setPhase('result_hold')
    },
    [setPhase],
  )

  const runOnce = useCallback(async () => {
    if (phaseRef.current === 'checking') return

    setPhase('checking')

    try {
      const frame = await captureJpegFrame(
        videoRef.current,
        canvasRef.current,
      )
      const data = await recognizeAtCamera(
        slug,
        frame,
      )
      const results = data.results

      if (results.length === 0) {
        setOutcome({ kind: 'no_face' })
        enterHold('no_face')
        return
      }

      const result = results[0]

      if (result.matched) {
        setOutcome({
          kind: 'matched',
          result,
        })
        matchSigRef.current = frameSignature(
          videoRef.current,
          sigCanvasRef.current,
        )
        watchStartedRef.current = Date.now()
        watchCapAtRef.current =
          Date.now() + WATCH_CAP_MS
        setPhase('watching')
        return
      }

      setOutcome({
        kind: 'no_match',
        distance: result.distance,
      })
      enterHold('no_match')
    } catch (caught) {
      if (caught instanceof RecognitionError) {
        if (caught.status === 404) {
          setOutcome({
            kind: 'error',
            message: caught.message,
          })
          setPhase('unavailable')
          onUnavailable?.(caught.message)
          return
        }
        if (
          caught.status === 400 &&
          /multiple faces/i.test(
            caught.message,
          )
        ) {
          setOutcome({ kind: 'multi_face' })
          enterHold('multi_face')
          return
        }
        setOutcome({
          kind: 'error',
          message:
            caught.status === 422
              ? 'That image could not be read. Try again.'
              : caught.status >= 500
                ? 'The recognition service is temporarily unavailable.'
                : caught.message,
        })
        enterHold('error')
        return
      }

      setOutcome({
        kind: 'error',
        message:
          caught instanceof Error &&
          caught.name === 'TypeError'
            ? 'Cannot reach the recognition service. Check the connection.'
            : caught instanceof Error
              ? caught.message
              : 'Recognition failed.',
      })
      enterHold('error')
    }
  }, [
    slug,
    enterHold,
    onUnavailable,
    setPhase,
    videoRef,
  ])

  /* ---------- the machine loop ---------- */

  useEffect(() => {
    if (!ready) return

    if (phaseRef.current === 'starting') {
      primedRef.current = false
      baselineSigRef.current = null
      armedAtRef.current = 0
      setPhase('scanning')
    }

    const id = window.setInterval(() => {
      const now = Date.now()
      const ph = phaseRef.current

      if (
        ph === 'checking' ||
        ph === 'unavailable' ||
        ph === 'starting'
      ) {
        return
      }

      if (ph === 'result_hold') {
        if (now >= holdUntilRef.current) {
          // cooldown before the auto gate can fire again
          resumeWaiting(AUTO_MIN_GAP_MS)
        }
        return
      }

      if (ph === 'watching') {
        if (
          now <
          watchStartedRef.current +
            MATCH_MIN_DISPLAY_MS
        ) {
          return
        }
        if (now >= watchCapAtRef.current) {
          resumeWaiting(300)
          return
        }
        const sig = frameSignature(
          videoRef.current,
          sigCanvasRef.current,
        )
        if (
          frameDelta(
            sig,
            matchSigRef.current,
          ) >= LEFT_DELTA
        ) {
          resumeWaiting(300)
        }
        return
      }

      // ph === 'scanning'
      if (!autoRef.current) return

      // one ungated call right after the camera opens, so a
      // person already in front of the camera is recognised
      if (!primedRef.current) {
        primedRef.current = true
        armedAtRef.current =
          now + AUTO_MIN_GAP_MS
        void runOnce()
        return
      }

      if (now < armedAtRef.current) return

      const sig = frameSignature(
        videoRef.current,
        sigCanvasRef.current,
      )
      if (!baselineSigRef.current) {
        // first quiet sample becomes the baseline
        baselineSigRef.current = sig
        return
      }
      if (
        frameDelta(
          sig,
          baselineSigRef.current,
        ) >= ENTER_DELTA
      ) {
        armedAtRef.current =
          now + AUTO_MIN_GAP_MS
        void runOnce()
      }
    }, TICK_MS)

    return () => window.clearInterval(id)
  }, [
    ready,
    runOnce,
    resumeWaiting,
    setPhase,
    videoRef,
  ])

  /* ---------- manual control ---------- */

  const recognizeNow = useCallback(() => {
    const ph = phaseRef.current
    if (
      ph === 'checking' ||
      ph === 'unavailable' ||
      ph === 'starting'
    ) {
      return
    }
    void runOnce()
  }, [runOnce])

  const dismissResult = useCallback(() => {
    if (phaseRef.current === 'unavailable')
      return
    setOutcome({ kind: 'idle' })
    baselineSigRef.current = null
    primedRef.current = true
    armedAtRef.current = Date.now()
    setPhase('scanning')
  }, [setPhase])

  return {
    phase,
    outcome,
    canvasRef,
    sigCanvasRef,
    recognizeNow,
    dismissResult,
  }
}

export default usePublicRecognition
