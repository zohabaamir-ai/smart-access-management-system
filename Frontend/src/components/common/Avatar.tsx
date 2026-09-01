/* =============================================================
   AVATAR

   Round identity chip for a MANAGEMENT USER (or the current
   account) — an image when there is one, otherwise the initials
   on a neutral ground. This is deliberately NOT used for a
   Person's enrollment photo, which is auth-fetched and rendered
   by <PersonPhoto>.
============================================================= */

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-xl',
}

function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return 'U'
  }

  const first = parts[0][0] ?? ''
  const last =
    parts.length > 1
      ? parts[parts.length - 1][0]
      : ''

  return (first + last).toUpperCase()
}

type AvatarProps = {
  name: string
  src?: string | null
  size?: AvatarSize
  className?: string
}

function Avatar({
  name,
  src,
  size = 'md',
  className = '',
}: AvatarProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300 ${SIZE[size]} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  )
}

export default Avatar
