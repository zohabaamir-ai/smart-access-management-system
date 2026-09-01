import {
  useEffect,
  useRef,
} from 'react'

import { Link } from 'react-router-dom'

import { ArrowRight, ScanFace } from 'lucide-react'

import useAsyncData from '../../hooks/useAsyncData'
import { getActivity } from '../../services/activityService'
import { formatRelativeTime } from '../../utils/time'
import { formatCnic } from '../activity/activityFormat'

import Card from '../common/Card'
import Skeleton from '../common/Skeleton'
import EmptyState from '../common/EmptyState'
import SectionLabel from '../common/SectionLabel'

/* =============================================================
   RECENT RECOGNITIONS  (Dashboard preview)

   A fixed preview of the 5 newest recognition events, ordered
   newest → oldest (the backend feed is timestamp-descending).
   There is no expander here — "View all activity" opens the
   full Activity page for anything beyond the latest 5.
============================================================= */

const PREVIEW = 5
const REFRESH_MS = 20_000

function RecentRecognitions() {
  const { data, loading, reload } =
    useAsyncData(() => getActivity({}), {
      apiErrorFallback:
        'Unable to load recent activity.',
      networkFallback:
        'Unable to load recent activity.',
    })

  const reloadRef = useRef(reload)
  useEffect(() => {
    reloadRef.current = reload
  })
  useEffect(() => {
    const id = window.setInterval(() => {
      if (
        document.visibilityState === 'visible'
      ) {
        void reloadRef.current()
      }
    }, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [])

  const events = data ?? []
  const total = events.length
  const visible = events.slice(0, PREVIEW)

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <SectionLabel>Activity</SectionLabel>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: PREVIEW }).map(
            (_, i) => (
              <Skeleton
                key={i}
                className="h-10 w-full"
              />
            ),
          )}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={ScanFace}
          title="No recognitions yet"
          description="Successful recognitions from any camera will appear here."
          compact
        />
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((event) => (
              <li
                key={event.id}
                className="flex items-center gap-4 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {event.person_name}
                  </p>
                  <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-500">
                    {formatCnic(
                      event.identifier,
                    )}
                  </p>
                </div>

                <span className="tnum shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {event.match_distance.toFixed(
                    3,
                  )}
                </span>

                <span className="tnum w-24 shrink-0 text-right text-xs text-slate-500 dark:text-slate-500">
                  {formatRelativeTime(
                    event.timestamp,
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-800">
            <span className="tnum text-xs text-slate-500 dark:text-slate-500">
              Showing {visible.length} of{' '}
              {total}
            </span>

            <Link
              to="/activity"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all activity
              <ArrowRight size={13} />
            </Link>
          </div>
        </>
      )}
    </Card>
  )
}

export default RecentRecognitions
