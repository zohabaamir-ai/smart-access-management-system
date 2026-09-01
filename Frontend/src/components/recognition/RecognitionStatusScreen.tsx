import { RefreshCw, XCircle } from 'lucide-react'

import type { ReactNode } from 'react'

import SystemLogo from '../branding/SystemLogo'
import Button from '../common/Button'

/* =============================================================
   RECOGNITION STATUS SCREEN

   The shared full-screen card for the non-running states of the
   public recognition page: camera not found, camera
   unavailable, or a load failure.
============================================================= */

type RecognitionStatusScreenProps = {
  title: string
  message: ReactNode
  footnote?: ReactNode
  actionLabel: string
  onAction: () => void
}

function RecognitionStatusScreen({
  title,
  message,
  footnote,
  actionLabel,
  onAction,
}: RecognitionStatusScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="elevation-1 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <div className="flex justify-center">
          <SystemLogo variant="full" size="sm" light />
        </div>

        <div className="mt-8 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <XCircle size={26} />
          </div>
        </div>

        <h1 className="mt-5 text-lg font-semibold text-white">
          {title}
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {message}
        </p>

        {footnote && (
          <p className="mt-4 font-mono text-xs text-slate-600">
            {footnote}
          </p>
        )}

        <div className="mt-6 flex justify-center">
          <Button
            icon={<RefreshCw size={15} />}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RecognitionStatusScreen
