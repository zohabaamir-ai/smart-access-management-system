import type {
  SelectHTMLAttributes,
  ReactNode,
} from 'react'

import { ChevronDown } from 'lucide-react'

/* =============================================================
   SELECT

   Native <select> restyled to match <Input>: same height,
   border, blue focus ring, plus a chevron. Keeping it native
   means the OS picker, keyboard handling and accessibility come
   for free.
============================================================= */

const BASE =
  'h-9 w-full appearance-none rounded-md border bg-white pl-3 pr-9 text-sm text-slate-900 outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800/60'

const OK_TONE =
  'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-700'

const INVALID_TONE =
  'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/50'

type SelectProps = {
  invalid?: boolean
  children: ReactNode
} & Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'className'
>

function Select({
  invalid = false,
  children,
  ...rest
}: SelectProps) {
  return (
    <div className="relative">
      <select
        className={`${BASE} ${
          invalid ? INVALID_TONE : OK_TONE
        }`}
        {...rest}
      >
        {children}
      </select>

      <ChevronDown
        size={15}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  )
}

export default Select
