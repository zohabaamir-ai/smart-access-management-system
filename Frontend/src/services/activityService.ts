import {
  apiFetch,
  request,
} from './api'

import type { PersonActivity } from './personService'

/* =============================================================
   ACTIVITY SERVICE

   Two distinct backend surfaces:

   1. getRecentActivity  -> GET /persons/activity/recent
      Backs the "recent activity" summary on the Persons screen.

   2. Activity feed       -> GET /activity  and  GET /activity/export
      The recognition-history view + CSV export. A read/query
      layer over Recognition Events: the list and the CSV share
      the exact same filter set (start_date, end_date, person_id,
      camera_id, search). No pagination — the backend returns the
      full filtered list, newest first.

   Types mirror app/schemas/activity_schemas.py :: ActivityResponse.
============================================================= */

export function getRecentActivity(): Promise<PersonActivity | null> {
  return request<PersonActivity | null>(
    '/persons/activity/recent',
    {},
    'Failed to load recent activity.',
  )
}

/* =============================================================
   ACTIVITY FEED
============================================================= */

// One row of recognition history, projected by the backend from
// a RecognitionEvent + its Person and Camera. identifier (CNIC)
// is non-null and visible to every management role in V1.
export interface ActivityEvent {
  id: number
  person_id: number
  person_name: string
  identifier: string
  camera_id: number
  camera_name: string
  camera_location: string
  timestamp: string
  match_distance: number
}

// Maps 1:1 to the backend query parameters. Empty / undefined
// values are omitted from the request.
export interface ActivityFilters {
  startDate?: string
  endDate?: string
  personId?: number
  cameraId?: number
  search?: string
}

function buildActivityQuery(
  filters: ActivityFilters,
): string {
  const params = new URLSearchParams()

  if (filters.startDate) {
    params.set(
      'start_date',
      filters.startDate,
    )
  }

  if (filters.endDate) {
    params.set('end_date', filters.endDate)
  }

  if (
    filters.personId !== undefined &&
    filters.personId !== null
  ) {
    params.set(
      'person_id',
      String(filters.personId),
    )
  }

  if (
    filters.cameraId !== undefined &&
    filters.cameraId !== null
  ) {
    params.set(
      'camera_id',
      String(filters.cameraId),
    )
  }

  const search = filters.search?.trim()

  if (search) {
    params.set('search', search)
  }

  const query = params.toString()

  return query ? `?${query}` : ''
}

export function getActivity(
  filters: ActivityFilters = {},
): Promise<ActivityEvent[]> {
  return request<ActivityEvent[]>(
    `/activity${buildActivityQuery(filters)}`,
    {},
    'Unable to load activity.',
  )
}

/* =============================================================
   CSV EXPORT

   GET /activity/export returns a text/csv body with a
   Content-Disposition attachment header. It is bearer-
   authenticated and not JSON, so it goes through apiFetch
   directly (same pattern as the person-photo blob) rather than
   request<T>. The caller turns the Blob into a download.
============================================================= */

export async function exportActivityCsv(
  filters: ActivityFilters = {},
): Promise<Blob> {
  const response = await apiFetch(
    `/activity/export${buildActivityQuery(filters)}`,
  )

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => null)

    throw new Error(
      body?.detail ||
        `ACTIVITY_EXPORT_FAILED_${response.status}`,
    )
  }

  return response.blob()
}
