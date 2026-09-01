import {
  useEffect,
  useRef,
} from 'react'

import PageHeader from '../../components/common/PageHeader'
import Alert from '../../components/common/Alert'

import DashboardAttention from '../../components/dashboard/DashboardAttention'
import CamerasSituation from '../../components/dashboard/CamerasSituation'
import TodaySituation from '../../components/dashboard/TodaySituation'
import DirectorySituation from '../../components/dashboard/DirectorySituation'
import RecentRecognitions from '../../components/dashboard/RecentRecognitions'
import useDashboard from '../../components/dashboard/useDashboard'

/* =============================================================
   DASHBOARD  — operational command center

   Reads, top to bottom:
     1. anything that needs attention  (disabled cameras)
     2. the situation panels   (cameras · today · directory)
     3. the latest recognitions preview

   The summary revalidates every 20s while the tab is visible.
============================================================= */

const REFRESH_MS = 20_000

function Dashboard() {
  const { dashboard, isLoading, error, reload } =
    useDashboard()

  const reloadRef = useRef(reload)
  useEffect(() => {
    reloadRef.current = reload
  })

  useEffect(() => {
    const tick = () => {
      if (
        document.visibilityState === 'visible'
      ) {
        void reloadRef.current()
      }
    }
    const id = window.setInterval(
      tick,
      REFRESH_MS,
    )
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Recognition activity, camera readiness, and people at a glance."
      />

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      <DashboardAttention />

      <div className="grid gap-4 lg:grid-cols-3">
        <CamerasSituation />
        <TodaySituation
          dashboard={dashboard}
          isLoading={isLoading}
        />
        <DirectorySituation
          dashboard={dashboard}
          isLoading={isLoading}
        />
      </div>

      <RecentRecognitions />
    </div>
  )
}

export default Dashboard
