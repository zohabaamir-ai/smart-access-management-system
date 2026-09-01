import type { ReactNode } from 'react'

/* =============================================================
   PAGE HEADER

   The "<h1> + subtitle + optional meta + optional right-side
   actions" block at the top of every page.
============================================================= */

type PageHeaderProps = {
  title: string
  description?: string
  /** small inline metadata beside the title (e.g. a count) */
  meta?: ReactNode
  actions?: ReactNode
}

function PageHeader({
  title,
  description,
  meta,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>

          {meta && (
            <span className="tnum rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-transparent dark:bg-slate-800 dark:text-slate-300">
              {meta}
            </span>
          )}
        </div>

        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}

export default PageHeader
