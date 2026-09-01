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

const BASE =
  'h-9 w-full rounded-md border bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/60'

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
          } ${showClear ? 'pr-9' : ''}`}
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

  return (
    <input
      className={`${BASE} ${tone}`}
      {...rest}
    />
  )
}

export default Input
