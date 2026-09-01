import type {
  InputHTMLAttributes,
  ReactNode,
} from 'react'

import { X } from 'lucide-react'

/* =============================================================
   INPUT

   The one text-input surface for the whole product. Blue focus
   ring, slate border, 36px control height. Optional leading
   icon, an `invalid` state, and an optional trailing clear
   button (shown only when the field has a value).

   <Input placeholder="Search…" icon={<Search size={15} />} />
   <Input value={q} onChange={…} onClear={() => setQ('')} icon={…} />
   <Input type="date" invalid />
============================================================= */

// `min-w-0 max-w-full` + the `::-webkit-datetime-edit` reset keep
// the control inside its box: native date/time inputs otherwise
// keep an intrinsic content min-width (spinner text + picker
// indicator) on mobile WebKit that defeats `w-full` and pushes
// them past a narrow grid/flex track.
// `text-base sm:text-sm` — 16px on phones stops iOS Safari from
// auto-zooming on focus; the approved 14px returns from `sm` up.
const BASE =
  'h-9 w-full min-w-0 max-w-full rounded-md border bg-white px-3 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:text-sm dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/60 [&::-webkit-datetime-edit]:min-w-0'

const OK_TONE =
  'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-700 dark:focus:border-blue-500'

const INVALID_TONE =
  'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/50'

type InputProps = {
  invalid?: boolean
  icon?: ReactNode
  /** show a trailing clear (×) button while the field has a value */
  onClear?: () => void
  /** accessible label for the clear button (default "Clear") */
  clearLabel?: string
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className'
>

function Input({
  invalid = false,
  icon,
  onClear,
  clearLabel = 'Clear',
  ...rest
}: InputProps) {
  const tone = invalid ? INVALID_TONE : OK_TONE

  const showClear =
    Boolean(onClear) &&
    String(rest.value ?? '').length > 0 &&
    !rest.disabled

  const nativePicker =
    rest.type === 'date' ||
    rest.type === 'time' ||
    rest.type === 'datetime-local' ||
    rest.type === 'month' ||
    rest.type === 'week'

  // Below `sm`, drop the native date/time control chrome: its
  // intrinsic minimum width otherwise ignores width:100% / max-width
  // and pushes the field past its filter-card column. Tapping still
  // opens the native picker; `sm`+ (desktop) keeps the native look.
  const pickerReset = nativePicker
    ? ' max-sm:appearance-none max-sm:[-webkit-appearance:none]'
    : ''

  if (icon || showClear) {
    return (
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </span>
        )}

        <input
          className={`${BASE} ${tone} ${
            icon ? 'pl-9' : ''
          } ${showClear ? 'pr-9' : ''}${pickerReset}`}
          {...rest}
        />

        {showClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  if (nativePicker) {
    // `appearance-none` (mobile) hides the browser's own
    // "mm/dd/yyyy" affordance, so an empty native date field looks
    // blank on a phone. Re-supply a visible hint below `sm` only,
    // shown while the field has no value. It's decorative
    // (aria-hidden) and pointer-through, so tapping still opens the
    // native picker. Desktop (`sm`+) keeps the browser's own text.
    const hasValue =
      String(rest.value ?? '').length > 0

    return (
      <span className="relative block">
        <input
          className={`${BASE} ${tone}${pickerReset}`}
          {...rest}
        />

        {rest.type === 'date' && !hasValue && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base text-slate-400 sm:hidden dark:text-slate-500"
          >
            mm/dd/yyyy
          </span>
        )}
      </span>
    )
  }

  return (
    <input
      className={`${BASE} ${tone}${pickerReset}`}
      {...rest}
    />
  )
}

export default Input
