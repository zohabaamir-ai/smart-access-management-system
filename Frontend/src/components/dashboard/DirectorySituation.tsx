import { Link } from 'react-router-dom'

import { ArrowRight, UsersRound } from 'lucide-react'

import Card from '../common/Card'
import Skeleton from '../common/Skeleton'

import type { DashboardResponse } from './types'

/* =============================================================
   DIRECTORY SITUATION

   How many people the system can recognize. A stable
   reference number, not a live metric.
============================================================= */

type Props = {
  dashboard: DashboardResponse | null
  isLoading: boolean
}

function DirectorySituation({
  dashboard,
  isLoading,
}: Props) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <UsersRound size={16} />
          </span>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Directory
          </h2>
        </div>

        <Link
          to="/persons"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Manage
          <ArrowRight size={13} />
        </Link>
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-20 w-full" />
      ) : (
        <>
          <p className="mt-4 flex items-baseline gap-1.5">
            <span className="tnum text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {dashboard?.total_persons ?? 0}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              enrolled
            </span>
          </p>

          <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            People with a registered face the
            system can recognize.
          </p>
        </>
      )}
    </Card>
  )
}

export default DirectorySituation
