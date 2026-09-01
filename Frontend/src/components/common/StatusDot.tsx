import type { ReactNode } from 'react'

/* =============================================================
   STATUS  (the one status language for the whole product)

   Four fixed semantic tones. Status is never communicated by
   colour alone — every dot pairs with a word.

     ok        emerald   healthy / online / active / matched
     attention amber     disabled / needs action / borderline
     fault     red       error / failure
     idle      slate     offline / inactive / no data

   <StatusDot tone="ok" />                     bare dot
   <StatusDot tone="attention" label="Disabled" />   dot + label
   <StatusPill tone="ok">Online</StatusPill>   tinted chip
============================================================= */

export type StatusTone =
  | 'ok'
  | 'attention'
  | 'fault'
  | 'idle'

const DOT: Record<StatusTone, string> = {
  ok: 'bg-emerald-500',
  attention: 'bg-amber-500',
  fault: 'bg-red-500',
  idle: 'bg-slate-400',
}

const TEXT: Record<StatusTone, string> = {
  ok: 'text-emerald-700 dark:text-emerald-400',
  attention: 'text-amber-700 dark:text-amber-400',
  fault: 'text-red-700 dark:text-red-400',
  idle: 'text-slate-500 dark:text-slate-400',
}

const PILL: Record<StatusTone, string> = {
  ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  attention:
    'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  fault: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  idle: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

type StatusDotProps = {
  tone: StatusTone
  label?: string
  pulse?: boolean
  className?: string
}

export function StatusDot({
  tone,
  label,
  pulse = false,
  className = '',
}: StatusDotProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${DOT[tone]} ${
          pulse ? 'soft-pulse' : ''
        }`}
        aria-hidden="true"
      />

      {label && (
        <span
          className={`text-xs font-medium ${TEXT[tone]}`}
        >
          {label}
        </span>
      )}
    </span>
  )
}

type StatusPillProps = {
  tone: StatusTone
  children: ReactNode
  className?: string
}

export function StatusPill({
  tone,
  children,
  className = '',
}: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${PILL[tone]} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]}`}
        aria-hidden="true"
      />
      {children}
    </span>
  )
}

export default StatusDot
