import {
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

/* =============================================================
   SHOW MORE BAR

   The shared "Showing X of Y · Show more / See less" footer for
   paged lists (Activity, Persons, Cameras, Users). Callers wrap
   it in whatever border/padding their surface needs.
============================================================= */

const LINK =
  'inline-flex items-center gap-1 rounded text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:text-white'

type ShowMoreBarProps = {
  shown: number
  total: number
  canShowMore: boolean
  canShowLess: boolean
  onShowMore: () => void
  onShowLess: () => void
  /** singular/plural noun, e.g. "person" */
  noun?: string
}

function ShowMoreBar({
  shown,
  total,
  canShowMore,
  canShowLess,
  onShowMore,
  onShowLess,
  noun,
}: ShowMoreBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <span className="tnum text-xs text-slate-500 dark:text-slate-500">
        Showing {shown} of {total}
        {noun
          ? ` ${total === 1 ? noun : `${noun}s`}`
          : ''}
      </span>

      {(canShowMore || canShowLess) && (
        <div className="flex items-center gap-3">
          {canShowMore && (
            <button
              type="button"
              onClick={onShowMore}
              className={LINK}
            >
              Show more
              <ChevronDown size={13} />
            </button>
          )}
          {canShowLess && (
            <button
              type="button"
              onClick={onShowLess}
              className={LINK}
            >
              See less
              <ChevronUp size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ShowMoreBar
