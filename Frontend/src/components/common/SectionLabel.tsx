import type { ReactNode } from 'react'

/* =============================================================
   SECTION LABEL

   The small uppercase kicker above a group of content
   (dashboard sections, sidebar groups, drawer sub-sections).
============================================================= */

type SectionLabelProps = {
  children: ReactNode
  right?: ReactNode
  className?: string
}

function SectionLabel({
  children,
  right,
  className = '',
}: SectionLabelProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${className}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
        {children}
      </span>

      {right}
    </div>
  )
}

export default SectionLabel
