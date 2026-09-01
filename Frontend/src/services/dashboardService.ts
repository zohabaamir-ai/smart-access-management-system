import { request } from './api'

/* =============================================================
   DASHBOARD SERVICE

   Backend calls for the dashboard summary. Types mirror the
   finalized backend GET /dashboard contract (DashboardResponse
   / DashboardRecentEntry). Returns parsed, typed data and
   throws ApiError on non-2xx. components/dashboard/types.ts
   re-exports these.
============================================================= */

export interface DashboardRecentEntry {
  id: number
  person_id: number
  name: string
  identifier: string
  timestamp: string
  match_distance: number
}

export interface DashboardResponse {
  total_persons: number
  todays_entries: number
  unique_persons_today: number
  average_match_distance: number | null
  recent_entries: DashboardRecentEntry[]
}

export function getDashboard(): Promise<DashboardResponse> {
  return request<DashboardResponse>(
    '/dashboard',
    {},
    'Failed to load dashboard data.',
  )
}
