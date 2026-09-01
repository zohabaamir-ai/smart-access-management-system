import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'

/* =============================================================
   ICON BUTTON

   Square, icon-only control (header controls, table row
   actions, drawer close). Always needs an aria-label / title.
============================================================= */

type IconButtonVariant =
  | 'default'
  | 'ghost'
  | 'danger'

type IconButtonSize = 'sm' | 'md'

const VARIANT: Record<
  IconButtonVariant,
  string
> = {
  default:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  ghost:
    'text-slate-500 hover:bg-white/10 hover:text-white',
  danger:
    'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30',
}

const SIZE: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
}

type IconButtonProps = {
  children: ReactNode
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'aria-label'
>

function IconButton({
  children,
  label,
  variant = 'default',
  size = 'sm',
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export default IconButton
