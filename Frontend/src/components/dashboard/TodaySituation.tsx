import { Link } from 'react-router-dom'

import {
  ArrowRight,
  CalendarClock,
} from 'lucide-react'

import Card from '../common/Card'
import Skeleton from '../common/Skeleton'

import { formatMatchDistance } from './dashboardFormat'

import type { DashboardResponse } from './types'

/* =============================================================
   TODAY SITUATION

   Recognition activity for the current day:

     · recognitions today   (the headline number)
     · distinct people recognized today

   average match distance is kept as a small diagnostic
   footnote — it is deliberately NOT a headline KPI.
============================================================= */

type Props = {
  dashboard: DashboardResponse | null
  isLoading: boolean
}

function TodaySituation({
  dashboard,
  isLoading,
}: Props) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <CalendarClock size={16} />
          </span>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Today
          </h2>
        </div>

        <Link
          to="/activity"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Activity
          <ArrowRight size={13} />
        </Link>
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-20 w-full" />
      ) : (
        <>
          <p className="mt-4 flex items-baseline gap-1.5">
            <span className="tnum text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {dashboard?.todays_entries ?? 0}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              recognitions
            </span>
          </p>

          <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 dark:text-slate-400">
                Distinct people
              </dt>
              <dd className="tnum font-medium text-slate-900 dark:text-white">
                {dashboard?.unique_persons_today ??
                  0}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
            Avg. match distance{' '}
            <span className="tnum">
              {formatMatchDistance(
                dashboard?.average_match_distance ??
                  null,
              )}
            </span>
          </p>
        </>
      )}
    </Card>
  )
}

export default TodaySituation
