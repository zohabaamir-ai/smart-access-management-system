import type {
  ReactNode,
  RefObject,
} from 'react'

import {
  CheckCircle2,
  ScanFace,
  UserX,
  Users,
} from 'lucide-react'

import Button from '../common/Button'
import CameraFrame from '../camera/CameraFrame'

import type {
  PublicRecognitionPhase,
  RecognitionOutcome,
} from './types'

/* =============================================================
   RECOGNITION PANEL  (public station)

   The shared CameraFrame with the recognition layer on top:
   a status ribbon, a scan sweep while checking, and a result
   overlay. In MANUAL mode (per-camera Auto recognition off) it
   also shows a "Recognise" button.
============================================================= */

type RecognitionPanelProps = {
  phase: PublicRecognitionPhase
  outcome: RecognitionOutcome
  auto: boolean
  ready: boolean
  cameraError: string
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  sigCanvasRef: RefObject<HTMLCanvasElement | null>
  onRecognize: () => void
  onDismiss: () => void
}

function toneFor(
  phase: PublicRecognitionPhase,
  outcome: RecognitionOutcome,
) {
  if (outcome.kind === 'matched') return 'ok'
  if (outcome.kind === 'no_match') return 'fault'
  if (outcome.kind === 'multi_face') return 'warn'
  // cyan only while a recognition is actually running; the
  // waiting state stays neutral so it reads as calm
  if (phase === 'checking') return 'scan'
  return 'idle' as const
}

function ribbonFor(
  phase: PublicRecognitionPhase,
  outcome: RecognitionOutcome,
  auto: boolean,
) {
  if (phase === 'checking') return 'Recognizing…'
  if (outcome.kind === 'multi_face') {
    return 'Please make sure only one person is in front of the camera'
  }
  if (outcome.kind === 'no_face') {
    return 'No face detected'
  }
  if (phase === 'scanning') {
    return auto
      ? 'Waiting for a face…'
      : 'Ready — press Recognise'
  }
  return null
}

function RecognitionPanel({
  phase,
  outcome,
  auto,
  ready,
  cameraError,
  videoRef,
  canvasRef,
  sigCanvasRef,
  onRecognize,
  onDismiss,
}: RecognitionPanelProps) {
  const showManualButton =
    !auto &&
    phase !== 'unavailable' &&
    !cameraError
  const showDismiss =
    !auto &&
    (outcome.kind === 'matched' ||
      outcome.kind === 'no_match' ||
      outcome.kind === 'error')

  return (
    <section className="flex min-h-0 min-w-0 flex-col gap-3">
      <div className="min-h-[42vh] flex-1">
        <CameraFrame
          videoRef={videoRef}
          tone={toneFor(phase, outcome)}
          notReady={!ready && !cameraError}
          notReadyLabel="Starting camera…"
          ribbon={ribbonFor(
            phase,
            outcome,
            auto,
          )}
          overlay={
            <>
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              <canvas
                ref={sigCanvasRef}
                className="hidden"
              />

              {phase === 'checking' && (
                <div className="pointer-events-none absolute inset-10 overflow-hidden rounded-lg">
                  <div className="scan-sweep h-16 w-full bg-linear-to-b from-transparent via-scan/40 to-transparent" />
                </div>
              )}

              {outcome.kind === 'matched' && (
                <ResultBar
                  tone="ok"
                  icon={
                    <CheckCircle2 size={24} />
                  }
                  kicker="Recognized"
                  title={
                    outcome.result.name ??
                    'Recognized person'
                  }
                />
              )}
              {outcome.kind === 'no_match' && (
                <ResultBar
                  tone="fault"
                  icon={<UserX size={24} />}
                  kicker="Not recognized"
                  title="No match found"
                />
              )}
              {outcome.kind ===
                'multi_face' && (
                <ResultBar
                  tone="warn"
                  icon={<Users size={24} />}
                  kicker="Multiple faces"
                  title="One person at a time, please"
                />
              )}
              {outcome.kind === 'error' && (
                <ResultBar
                  tone="fault"
                  icon={
                    <ScanFace size={24} />
                  }
                  kicker="Recognition error"
                  title={outcome.message}
                />
              )}
            </>
          }
        />
      </div>

      {cameraError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {cameraError}
        </div>
      )}

      {(showManualButton || showDismiss) && (
        <div className="flex justify-center gap-2">
          {showDismiss && (
            <Button
              variant="secondary"
              size="lg"
              onClick={onDismiss}
            >
              Scan again
            </Button>
          )}
          {showManualButton && (
            <Button
              size="lg"
              icon={<ScanFace size={17} />}
              loading={phase === 'checking'}
              disabled={!ready}
              onClick={onRecognize}
            >
              Recognise
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

function ResultBar({
  tone,
  icon,
  kicker,
  title,
}: {
  tone: 'ok' | 'fault' | 'warn'
  icon: ReactNode
  kicker: string
  title: string
}) {
  const bg =
    tone === 'ok'
      ? 'bg-emerald-500/92'
      : tone === 'warn'
        ? 'bg-amber-500/92'
        : 'bg-red-500/92'

  return (
    <div
      className={`absolute inset-x-0 bottom-0 flex items-center gap-4 px-6 py-5 text-white backdrop-blur ${bg}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
          {kicker}
        </p>
        <p className="mt-0.5 truncate text-lg font-semibold">
          {title}
        </p>
      </div>
    </div>
  )
}

export default RecognitionPanel
