import { useState } from 'react'

import { Link } from 'react-router-dom'

import { ArrowRight, X } from 'lucide-react'

import useCameras from '../../context/cameras/useCameras'
import { hasPermission } from '../../services/permissions'

import { StatusDot } from '../common/StatusDot'

/* =============================================================
   DASHBOARD ATTENTION

   Genuine attention items only. V1 knows about exactly one:
   one or more cameras have been administratively disabled and
   will not accept recognitions.

   Shown only to roles that can act on it (manage_cameras —
   Admin / Super Admin). The [×] dismisses the banner for the
   rest of this browser session only (sessionStorage) — it does
   NOT touch the camera, the database, or any other session. A
   fresh session shows it again while a camera stays disabled.

   No fabricated health alerts, no "no activity in N hours".
============================================================= */

const DISMISS_KEY =
  'zohab.dashboard.disabledCamerasDismissed'

function readDismissed(): boolean {
  try {
    return (
      window.sessionStorage.getItem(
        DISMISS_KEY,
      ) === '1'
    )
  } catch {
    return false
  }
}

function DashboardAttention() {
  const { cameras } = useCameras()
  const [dismissed, setDismissed] = useState(
    readDismissed,
  )

  // Only surfaced to managers who can re-enable a camera.
  if (!hasPermission('manage_cameras')) {
    return null
  }

  const disabled = cameras.filter(
    (camera) => !camera.is_active,
  )

  if (disabled.length === 0 || dismissed) {
    return null
  }

  const names = disabled
    .slice(0, 3)
    .map((camera) => camera.name)
    .join(', ')
  const extra = disabled.length - 3

  function dismiss() {
    try {
      window.sessionStorage.setItem(
        DISMISS_KEY,
        '1',
      )
    } catch {
      /* session storage unavailable — dismiss for this mount */
    }
    setDismissed(true)
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
      <StatusDot tone="attention" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
          {disabled.length === 1
            ? 'Camera disabled'
            : 'Cameras disabled'}
        </p>
        <p className="truncate text-xs text-amber-700/80 dark:text-amber-300/70">
          {disabled.length === 1
            ? '1 camera is currently disabled'
            : `${disabled.length} cameras are currently disabled`}
          {names ? ` · ${names}` : ''}
          {extra > 0 ? ` +${extra} more` : ''}
        </p>
      </div>

      <Link
        to="/cameras"
        className="group inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-800 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
      >
        Review
        <ArrowRight
          size={13}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </Link>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss disabled-camera warning for this session"
        className="shrink-0 rounded-md p-1 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900 dark:text-amber-400 dark:hover:bg-amber-900/40 dark:hover:text-amber-200"
      >
        <X size={15} />
      </button>
    </div>
  )
}

export default DashboardAttention
