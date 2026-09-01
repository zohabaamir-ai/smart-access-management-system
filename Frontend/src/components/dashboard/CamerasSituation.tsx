import { Link } from 'react-router-dom'

import { ArrowRight, Cctv } from 'lucide-react'

import useCameras from '../../context/cameras/useCameras'

import Card from '../common/Card'
import Skeleton from '../common/Skeleton'
import { StatusDot } from '../common/StatusDot'
import type { StatusTone } from '../common/StatusDot'

/* =============================================================
   CAMERAS SITUATION

   An operational Online / Offline summary of the camera fleet:

     · enabled / total   headline
     · Online   — enabled cameras whose PUBLIC recognition URL
                  currently has a live session
     · Offline  — enabled cameras with no active public session

   Disabled cameras are an administrative state surfaced through
   the Dashboard attention banner, not here. No hardware health,
   no heartbeat — V1 has no such signal.
============================================================= */

function CamerasSituation() {
  const {
    cameras,
    isLoading,
    error,
    activeSessionSlugs,
  } = useCameras()

  const total = cameras.length
  const enabled = cameras.filter(
    (c) => c.is_active,
  ).length
  const online = cameras.filter(
    (c) =>
      c.is_active &&
      activeSessionSlugs.has(c.slug),
  ).length
  const offline = enabled - online

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Cctv size={16} />
          </span>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Cameras
          </h2>
        </div>

        <Link
          to="/cameras"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Open
          <ArrowRight size={13} />
        </Link>
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-20 w-full" />
      ) : error ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Camera status is unavailable right
          now.
        </p>
      ) : total === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No cameras have been added yet.
        </p>
      ) : (
        <>
          <p className="mt-4 flex items-baseline gap-1.5">
            <span className="tnum text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {enabled}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              of {total} enabled
            </span>
          </p>

          <dl className="mt-4 space-y-2.5 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
            <StatusRow
              tone="ok"
              label="Online"
              value={online}
            />
            <StatusRow
              tone="idle"
              label="Offline"
              value={offline}
            />
          </dl>
        </>
      )}
    </Card>
  )
}

function StatusRow({
  tone,
  label,
  value,
}: {
  tone: StatusTone
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between">
      <dt>
        <StatusDot tone={tone} label={label} />
      </dt>
      <dd
        className={`tnum font-medium ${
          value === 0
            ? 'text-slate-500 dark:text-slate-500'
            : 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

export default CamerasSituation
