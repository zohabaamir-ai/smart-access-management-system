import useAsyncData from '../../hooks/useAsyncData'
import { getDashboard } from '../../services/dashboardService'

/* =============================================================
   useDashboard

   Loads the /dashboard summary on mount via the shared
   useAsyncData query lifecycle. The service call and the two
   fallback messages stay here; everything else is generic.
============================================================= */

export function useDashboard() {
  const { data, loading, error, reload } =
    useAsyncData(getDashboard, {
      apiErrorFallback:
        'Failed to load dashboard data.',
      networkFallback:
        'Unable to connect to the access management server.',
    })

  return {
    dashboard: data,
    isLoading: loading,
    error,
    reload,
  }
}

export default useDashboard
