import { ShieldAlert } from 'lucide-react'

/* =============================================================
   NOT AUTHORIZED

   The single, shared "you can't do this" surface for the whole
   app. Use this instead of hand-written per-page permission
   messages.

   - variant="page"   full-width card, for a route / section the
                      current role may not open
   - variant="inline" compact banner, for a blocked action area
                      inside an otherwise-allowed page
============================================================= */

export const NOT_AUTHORIZED_MESSAGE =
  "You don't have permission to perform this action."

export const NOT_AUTHORIZED_PAGE_MESSAGE =
  "You don't have permission to view this page."

type NotAuthorizedProps = {
  message?: string
  variant?: 'page' | 'inline'
  className?: string
}

function NotAuthorized({
  message = NOT_AUTHORIZED_MESSAGE,
  variant = 'page',
  className = '',
}: NotAuthorizedProps) {
  if (variant === 'inline') {
    return (
      <div
        role="alert"
        className={`flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300 ${className}`}
      >
        <ShieldAlert
          size={16}
          className="mt-0.5 shrink-0"
        />

        <span>{message}</span>
      </div>
    )
  }

  return (
    <div
      role="alert"
      className={`rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
          <ShieldAlert size={26} />
        </div>

        <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          Access restricted
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          {message}
        </p>
      </div>
    </div>
  )
}

export default NotAuthorized
