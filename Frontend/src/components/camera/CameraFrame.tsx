import type {
  ReactNode,
  RefObject,
} from 'react'

import { VideoOff } from 'lucide-react'

/* =============================================================
   CAMERA FRAME

   The one Zohab camera viewport. A <video> under a corner-tick
   recognition frame. Both the management camera preview and the
   public recognition page render this — the public page layers
   recognition UI into `overlay`.

   tone   — frame border colour:
     idle  neutral (preview, or scanning-idle)
     scan  cyan  (a recognition check is running)
     ok    emerald (recognized)
     fault red   (not recognized / error)
     warn  amber  (multiple faces)
   ribbon  — small pill at top-centre (status text)
   overlay — absolutely-positioned layer (result bar, sweep…)
============================================================= */

type FrameTone =
  | 'idle'
  | 'scan'
  | 'ok'
  | 'fault'
  | 'warn'

const BORDER: Record<FrameTone, string> = {
  idle: 'border-white/20',
  scan: 'border-scan/70',
  ok: 'border-emerald-400/80',
  fault: 'border-red-400/75',
  warn: 'border-amber-400/80',
}

const TICK: Record<FrameTone, string> = {
  idle: 'border-white/40',
  scan: 'border-scan',
  ok: 'border-emerald-400',
  fault: 'border-red-400',
  warn: 'border-amber-400',
}

type CameraFrameProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  tone?: FrameTone
  ribbon?: ReactNode
  overlay?: ReactNode
  /** stream not live yet — show a centred hint instead of ticks */
  notReady?: boolean
  notReadyLabel?: string
  /** hide the tick frame entirely (plain preview) */
  bare?: boolean
}

function CameraFrame({
  videoRef,
  tone = 'idle',
  ribbon,
  overlay,
  notReady = false,
  notReadyLabel = 'Connecting to camera…',
  bare = false,
}: CameraFrameProps) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-950">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover"
      />

      {!bare && !notReady && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-6 rounded-lg border transition-colors duration-300 sm:inset-10 ${BORDER[tone]}`}
        >
          {[
            'left-0 top-0 border-l-2 border-t-2',
            'right-0 top-0 border-r-2 border-t-2',
            'left-0 bottom-0 border-l-2 border-b-2',
            'right-0 bottom-0 border-r-2 border-b-2',
          ].map((pos) => (
            <span
              key={pos}
              className={`absolute h-6 w-6 rounded-[3px] ${pos} ${TICK[tone]}`}
            />
          ))}
        </div>
      )}

      {ribbon && (
        <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-slate-950/60 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
          {ribbon}
        </div>
      )}

      {notReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70 text-slate-300">
          <VideoOff size={22} />
          <p className="text-sm">
            {notReadyLabel}
          </p>
        </div>
      )}

      {overlay}
    </div>
  )
}

export default CameraFrame
