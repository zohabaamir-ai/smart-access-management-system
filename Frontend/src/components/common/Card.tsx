import type {
  ElementType,
  ReactNode,
} from 'react'

/* =============================================================
   CARD  (level-0 surface)

   The surface used for every in-page panel/section. In light
   mode it carries a hairline border plus a very soft shadow so
   the white surface lifts off the slate page background. In
   dark mode the border alone does the separation (shadows don't
   read on a near-black page). Stronger elevation stays reserved
   for things that truly float — menus, drawers, dialogs, toasts.

   <Card>…</Card>
   <Card title="Appearance" description="…" bodyClassName="p-6">…</Card>
   <Card as="section" className="p-5">…</Card>
============================================================= */

type CardProps = {
  children: ReactNode
  as?: ElementType
  title?: string
  description?: string
  /** wrapper around children when a title/description is shown */
  bodyClassName?: string
  /** extra classes on the outer surface */
  className?: string
  headerRight?: ReactNode
}

function Card({
  children,
  as,
  title,
  description,
  bodyClassName = 'p-6',
  className = '',
  headerRight,
}: CardProps) {
  const Tag = as ?? 'div'

  const hasHeader =
    Boolean(title) ||
    Boolean(description)

  return (
    <Tag
      className={`rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgb(2_6_23/0.04),0_1px_3px_rgb(2_6_23/0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none ${className}`}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            {title && (
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {title}
              </h2>
            )}

            {description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>

          {headerRight}
        </div>
      )}

      {hasHeader ? (
        <div className={bodyClassName}>
          {children}
        </div>
      ) : (
        children
      )}
    </Tag>
  )
}

export default Card
