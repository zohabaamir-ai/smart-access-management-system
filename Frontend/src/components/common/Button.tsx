import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'

import Spinner from './Spinner'

/* =============================================================
   BUTTON

   Single source of truth for button styling.

   <Button>Save</Button>                             primary (accent)
   <Button variant="secondary">Cancel</Button>
   <Button variant="danger" loading={saving}>Delete</Button>
   <Button variant="dangerOutline" icon={<Trash2 size={14} />}>Remove</Button>
   <Button variant="ghost" size="sm">…</Button>
============================================================= */

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'dangerOutline'
  | 'ghost'

type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950'

const VARIANT: Record<
  ButtonVariant,
  string
> = {
  // One confident blue accent for the primary action.
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500',
  secondary:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  dangerOutline:
    'border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
}

const SIZE: Record<
  ButtonSize,
  string
> = {
  sm: 'h-8 rounded-md px-3 text-xs',
  md: 'h-9 rounded-md px-4 text-sm',
  lg: 'h-11 rounded-lg px-5 text-sm',
}

type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
  children: ReactNode
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
>

function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${
        fullWidth ? 'w-full' : ''
      }`}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : icon}

      {children}
    </button>
  )
}

export default Button
