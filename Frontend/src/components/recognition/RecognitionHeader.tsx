import SystemLogo from '../branding/SystemLogo'

import type { RecognitionCamera } from './types'

/* =============================================================
   RECOGNITION HEADER

   Top bar of the running public recognition screen: system
   logo + the resolved Camera identity, plus a persistent,
   always-above-the-fold mode pill (Auto / Manual). This is the
   one indicator of the current Auto Recognition state that is
   guaranteed visible without scrolling on any device — the
   camera-view ribbon and the sidebar's own status dot are both
   phase/scroll dependent. There is deliberately no "online"
   pill — V1 has no camera liveness signal, so an "online" claim
   would be fabricated.

   Below `sm` the full wordmark (shield + "Smart Access") was
   fighting the camera name for the same ~150px it needs, so the
   camera identity was truncating to nothing on a phone. Below
   `sm` the header shows the shield mark only — the full wordmark
   is unchanged at `sm` and up.
============================================================= */

type RecognitionHeaderProps = {
  camera: RecognitionCamera
  auto: boolean
}

function RecognitionHeader({
  camera,
  auto,
}: RecognitionHeaderProps) {
  return (
    <header className="h-20 shrink-0 border-b border-slate-200 bg-white/95 dark:border-white/10 dark:bg-slate-950/95">
      <div className="mx-auto flex h-full min-w-0 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <span className="shrink-0 sm:hidden">
            <SystemLogo
              variant="mark"
              size="sm"
            />
          </span>
          <span className="hidden shrink-0 whitespace-nowrap sm:flex">
            <SystemLogo
              variant="full"
              size="sm"
            />
          </span>

          <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-white/10" />

          <div className="min-w-0 flex-1">
            <p
              title={camera.name}
              className="truncate text-sm font-semibold tracking-wide text-slate-900 dark:text-white"
            >
              {camera.name}
            </p>

            <p
              title={camera.location}
              className="truncate text-[11px] text-slate-500 dark:text-slate-400"
            >
              {camera.location}
            </p>
          </div>
        </div>

        <div
          className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 ${
            auto
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30'
              : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${
              auto
                ? 'soft-pulse bg-emerald-500'
                : 'bg-slate-400 dark:bg-slate-500'
            }`}
          />

          <span
            className={`text-xs font-medium ${
              auto
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {auto
              ? 'Auto Recognition On'
              : 'Manual Recognition'}
          </span>
        </div>
      </div>
    </header>
  )
}

export default RecognitionHeader
