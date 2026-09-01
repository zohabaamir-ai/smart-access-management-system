import { X } from 'lucide-react'

import type { ReactNode } from 'react'

/* =============================================================
   ALERT

   Shared inline message box (error / success / warning / info).
   Replaces the per-page red/green/amber <div> banners so every
   page speaks one language.

   The default palette matches what most pages already use:
     border-{c}-200 bg-{c}-50 text-{c}-700
     dark:border-{c}-900/50 dark:bg-{c}-950/30 dark:text-{c}-400
============================================================= */

type AlertVariant =
  | 'error'
  | 'success'
  | 'warning'
  | 'info'

const VARIANT_CLASS: Record<
  AlertVariant,
  string
> = {
  error:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300',
  info:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300',
}

type AlertProps = {
  children: ReactNode
  variant?: AlertVariant
  onDismiss?: () => void
  icon?: ReactNode
  className?: string
}

function Alert({
  children,
  variant = 'error',
  onDismiss,
  icon,
  className = '',
}: AlertProps) {
  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${VARIANT_CLASS[variant]} ${className}`}
    >
      {icon ? (
        <span className="flex items-start gap-2">
          <span className="mt-px shrink-0">
            {icon}
          </span>

          <span>{children}</span>
        </span>
      ) : (
        <span>{children}</span>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export default Alert
