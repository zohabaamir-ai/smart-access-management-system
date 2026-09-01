import { useState } from 'react'

import {
  ChevronDown,
  ChevronUp,
  ScanFace,
} from 'lucide-react'

import Card from '../common/Card'
import Skeleton from '../common/Skeleton'
import EmptyState from '../common/EmptyState'
import Highlight from '../common/Highlight'

import { formatRelativeTime } from '../../utils/time'
import {
  formatCnic,
  formatDate,
  formatTime,
} from './activityFormat'

import type { ActivityEvent } from './types'

/* =============================================================
   ACTIVITY TABLE

   One row per recognition event, newest first, on the same
   white Card surface as the Dashboard activity list. Renders a
   page of PAGE_SIZE rows and grows in PAGE_SIZE steps via
   "Show more" / "See less"; export always covers the full
   filtered set. The parent remounts this (via `key`) when the
   filters change, so the page resets to the first PAGE_SIZE.
   Search matches are highlighted in place.
============================================================= */

const PAGE_SIZE = 25

type ActivityTableProps = {
  events: ActivityEvent[]
  isLoading: boolean
  hasActiveFilters: boolean
  /** live search text — matches are highlighted in the rows */
  query?: string
}

function ActivityTable({
  events,
  isLoading,
  hasActiveFilters,
  query = '',
}: ActivityTableProps) {
  const q = query.trim()

  const [visibleCount, setVisibleCount] =
    useState(PAGE_SIZE)

  const total = events.length
  const visible = events.slice(
    0,
    visibleCount,
  )

  const canShowMore = visibleCount < total
  const canShowLess = visibleCount > PAGE_SIZE
  const showFooter =
    total > PAGE_SIZE ||
    visibleCount > PAGE_SIZE

  return (
    <Card className="overflow-hidden">
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map(
            (_, i) => (
              <Skeleton
                key={i}
                className="h-14 w-full"
              />
            ),
          )}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={ScanFace}
          title={
            hasActiveFilters
              ? 'No events match these filters'
              : 'No recognition events yet'
          }
          description={
            hasActiveFilters
              ? 'Widen the date range or clear a filter to see more.'
              : 'Recognitions from any camera will show up here as they happen.'
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-500">
                  <th className="px-4 py-2.5">
                    Person
                  </th>
                  <th className="px-4 py-2.5">
                    CNIC
                  </th>
                  <th className="px-4 py-2.5">
                    Camera
                  </th>
                  <th className="px-4 py-2.5">
                    When
                  </th>
                  <th className="px-4 py-2.5 text-right">
                    Match
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map((event) => (
                  <tr
                    key={event.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className="block max-w-64 truncate text-sm font-medium text-slate-900 dark:text-white"
                        title={
                          event.person_name
                        }
                      >
                        <Highlight
                          text={
                            event.person_name
                          }
                          query={q}
                        />
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      <Highlight
                        text={formatCnic(
                          event.identifier,
                        )}
                        query={q}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className="block max-w-56 truncate text-sm text-slate-700 dark:text-slate-200"
                        title={
                          event.camera_name
                        }
                      >
                        <Highlight
                          text={
                            event.camera_name
                          }
                          query={q}
                        />
                      </span>
                      <span
                        className="block max-w-56 truncate text-xs text-slate-500 dark:text-slate-500"
                        title={
                          event.camera_location
                        }
                      >
                        {event.camera_location}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="block text-sm text-slate-700 dark:text-slate-200">
                        {formatRelativeTime(
                          event.timestamp,
                        )}
                      </span>
                      <span className="tnum block text-xs text-slate-500 dark:text-slate-500">
                        {formatDate(
                          event.timestamp,
                        )}
                        {' · '}
                        {formatTime(
                          event.timestamp,
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="tnum inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {event.match_distance.toFixed(
                          3,
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showFooter && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <span className="tnum text-xs text-slate-500 dark:text-slate-500">
                Showing {visible.length} of{' '}
                {total}
              </span>

              <div className="flex items-center gap-3">
                {canShowMore && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount(
                        (v) => v + PAGE_SIZE,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:text-white"
                  >
                    Show more
                    <ChevronDown size={13} />
                  </button>
                )}
                {canShowLess && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount(
                        PAGE_SIZE,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:text-white"
                  >
                    See less
                    <ChevronUp size={13} />
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default ActivityTable
