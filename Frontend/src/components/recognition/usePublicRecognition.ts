import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { RefObject } from 'react'

import {
  recognizeAtCamera,
  RecognitionError,
} from '../../services/recognitionService'
import {
  autoRecognitionKey,
  getAutoRecognition,
  startRecognitionSession,
} from '../../context/cameras/cameraSessions'

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
   (/recognition/camera/:slug). One loop drives both modes:

     AUTO   (per-camera config on)  — a recognition runs every
            RECOGNITION_INTERVAL_MS while in "scanning"
     MANUAL (per-camera config off) — recognizeNow() runs one

   Outcomes (backend contract, POST /recognition/camera/{slug}):
     results: []                    -> no face   (NO event)
     results: [{ matched: false }]  -> no match  (NO event)
     results: [{ matched: true }]   -> matched   (backend logs 1 event)
     400 "Multiple faces detected"  -> multi face (NO event)
     400 "Invalid image file."      -> bad frame  (NO event)
     404 disabled / decommissioned  -> unavailable (terminal)
     422 / 5xx / network            -> request failure

   Repeated-recognition control:
     After a MATCH the machine enters "watching" and issues NO
     recognition calls. It compares a coarse frame signature to
     the matched frame; a large scene change = the person left
     -> resume scanning. WATCH_CAP_MS is a backstop if the scene
     stays similar. This is a pixel-delta heuristic, NOT true
     face-presence tracking.

   Session presence:
     While the camera stream is live, this hook heartbeats the
     camera's public session (localStorage), which is what makes
     the camera ONLINE in the management app.
============================================================= */

export const RECOGNITION_INTERVAL_MS = 2500

const HOLD_MS: Record<string, number> = {
  no_face: 700,
  multi_face: 2200,
  no_match: 2800,
  error: 2500,
}

const MATCH_MIN_DISPLAY_MS = 2500
const WATCH_CAP_MS = 45_000
const LEFT_DELTA = 0.12
const TICK_MS = 400

type Options = {
  slug: string
  videoRef: RefObject<HTMLVideoElement | null>
  // camera stream is ready (video has dimensions)
  ready: boolean
  onUnavailable?: (message: string) => void
}

export function usePublicRecognition({
  slug,
  videoRef,
  ready,
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
  const [auto, setAuto] = useState<boolean>(
    () => getAutoRecognition(slug),
  )

  const phaseRef = useRef(phase)
  const autoRef = useRef(auto)
  const nextRunRef = useRef(0)
  const holdUntilRef = useRef(0)
  const watchStartedRef = useRef(0)
  const watchCapAtRef = useRef(0)
  const matchSigRef =
    useRef<Uint8Array | null>(null)

  useEffect(() => {
    autoRef.current = auto
  }, [auto])

  // keep the auto flag in sync if the management app flips it
  // in another tab while this page is open
  useEffect(() => {
    const key = autoRecognitionKey(slug)
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        setAuto(getAutoRecognition(slug))
      }
    }
    window.addEventListener(
      'storage',
      onStorage,
    )
    return () =>
      window.removeEventListener(
        'storage',
        onStorage,
      )
  }, [slug])

  // heartbeat the public session while the stream is live
  useEffect(() => {
    if (!ready) return
    const stop = startRecognitionSession(slug)
    return stop
  }, [ready, slug])

  const setPhase = useCallback(
    (next: PublicRecognitionPhase) => {
      phaseRef.current = next
      setPhaseState(next)
    },
    [],
  )

  const enterHold = useCallback(
    (kind: keyof typeof HOLD_MS) => {
      const until =
        Date.now() + (HOLD_MS[kind] ?? 2000)
      holdUntilRef.current = until
      nextRunRef.current = until
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
      setPhase('scanning')
      nextRunRef.current = Date.now()
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
          setPhase('scanning')
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
          setPhase('scanning')
          nextRunRef.current = now
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
          setPhase('scanning')
          nextRunRef.current = now + 300
        }
        return
      }

      // ph === 'scanning'
      if (!autoRef.current) return
      if (now >= nextRunRef.current) {
        nextRunRef.current =
          now + RECOGNITION_INTERVAL_MS
        void runOnce()
      }
    }, TICK_MS)

    return () => window.clearInterval(id)
  }, [ready, runOnce, setPhase, videoRef])

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
    nextRunRef.current = Date.now()
    setPhase('scanning')
  }, [setPhase])

  return {
    phase,
    outcome,
    auto,
    canvasRef,
    sigCanvasRef,
    recognizeNow,
    dismissResult,
  }
}

export default usePublicRecognition
