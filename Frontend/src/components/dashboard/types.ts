/* =============================================================
   DASHBOARD TYPES

   The dashboard response shape now lives with its service
   (services/dashboardService.ts); re-exported here so existing
   imports keep working.
============================================================= */

export type {
  DashboardRecentEntry,
  DashboardResponse,
} from '../../services/dashboardService'
