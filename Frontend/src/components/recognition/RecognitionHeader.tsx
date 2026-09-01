import { ScanFace } from 'lucide-react'

import SystemLogo from '../branding/SystemLogo'

import type { RecognitionCamera } from './types'

/* =============================================================
   RECOGNITION HEADER

   Top bar of the running public recognition screen: system
   logo + the resolved Camera identity. There is deliberately no
   "online" pill — V1 has no camera liveness signal, so an
   "online" claim would be fabricated.
============================================================= */

type RecognitionHeaderProps = {
  camera: RecognitionCamera
}

function RecognitionHeader({
  camera,
}: RecognitionHeaderProps) {
  return (
    <header className="h-20 shrink-0 border-b border-slate-200 bg-white/95 dark:border-white/10 dark:bg-slate-950/95">
      <div className="mx-auto flex h-full min-w-0 max-w-7xl items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <SystemLogo
            variant="full"
            size="sm"
          />

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

        <div className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
          <ScanFace
            size={14}
            className="text-slate-500 dark:text-slate-400"
          />

          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Recognition Camera
          </span>
        </div>
      </div>
    </header>
  )
}

export default RecognitionHeader
