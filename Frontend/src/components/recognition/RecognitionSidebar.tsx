import {
  MapPin,
  ScanFace,
} from 'lucide-react'

import { StatusDot } from '../common/StatusDot'

import type { RecognitionCamera } from './types'

/* =============================================================
   RECOGNITION SIDEBAR

   Camera identity + short instructions on the public
   recognition page. The instructions change with the camera's
   Auto recognition setting.
============================================================= */

type RecognitionSidebarProps = {
  camera: RecognitionCamera
  auto: boolean
}

function RecognitionSidebar({
  camera,
  auto,
}: RecognitionSidebarProps) {
  const steps = auto
    ? [
        'Stand in front of the camera.',
        'Make sure only your face is in view.',
        'Wait a moment — it recognises automatically.',
      ]
    : [
        'Stand in front of the camera.',
        'Make sure only your face is in view.',
        'Press Recognise.',
      ]

  return (
    <aside className="flex min-h-0 min-w-0 flex-col gap-4">
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-scan-soft text-scan-strong dark:bg-scan/10 dark:text-scan">
            <ScanFace size={19} />
          </span>
          <h2
            title={camera.name}
            className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900 dark:text-white"
          >
            {camera.name}
          </h2>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <MapPin
              size={14}
              className="shrink-0 text-slate-500"
            />
            <span className="truncate">
              {camera.location}
            </span>
          </p>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-500">
            {camera.slug}
          </p>
          <StatusDot
            tone={auto ? 'ok' : 'idle'}
            label={
              auto
                ? 'Auto recognition on'
                : 'Manual recognition'
            }
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
          How to use this
        </p>
        <ol className="mt-3 space-y-3">
          {steps.map((step, i) => (
            <li
              key={step}
              className="flex items-center gap-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {i + 1}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {step}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-500">
          Recognitions are matched against the
          enrolled persons and recorded in
          Activity.
        </p>
      </div>
    </aside>
  )
}

export default RecognitionSidebar
