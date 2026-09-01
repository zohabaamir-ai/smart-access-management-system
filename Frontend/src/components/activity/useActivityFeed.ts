import {
  useCallback,
  useMemo,
  useState,
} from 'react'

import useAsyncData from '../../hooks/useAsyncData'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import {
  getActivity,
  type ActivityEvent,
  type ActivityFilters,
} from '../../services/activityService'

import { formatCnic } from './activityFormat'

/* =============================================================
   useActivityFeed

   Coherent interaction model:

     · DATE RANGE  → the only server query (GET /activity), the
       backend's single supported bound. Debounced; a From > To
       range is flagged and not sent (the backend would 400).
       "To" defaults to today (inclusive on the backend), which
       is effectively "no upper bound" for real data.

     · SEARCH / PERSON / CAMERA  → applied live on the frontend
       over the fetched set (no request per keystroke, and the
       single-id backend params can't express a multi-select).
       Search mirrors the backend (person name + CNIC) and also
       matches the camera name.

   Everything takes effect immediately — there is no "Apply".
============================================================= */

function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(
    2,
    '0',
  )
  const day = String(d.getDate()).padStart(
    2,
    '0',
  )
  return `${d.getFullYear()}-${m}-${day}`
}

export function useActivityFeed() {
  const today = useMemo(() => todayISO(), [])

  /* ---- server query: date range only ---- */

  const [startDate, setStartDate] =
    useState('')
  const [endDate, setEndDate] =
    useState(today)

  const rangeInvalid = Boolean(
    startDate &&
      endDate &&
      endDate < startDate,
  )

  const debouncedRange = useDebouncedValue(
    { startDate, endDate },
    350,
  )

  const {
    data,
    loading: isLoading,
    error,
  } = useAsyncData<ActivityEvent[]>(
    () =>
      getActivity({
        startDate:
          debouncedRange.startDate ||
          undefined,
        endDate:
          debouncedRange.endDate || undefined,
      }),
    {
      deps: [
        debouncedRange.startDate,
        debouncedRange.endDate,
      ],
      enabled: !rangeInvalid,
      apiErrorFallback:
        'Unable to load activity.',
      networkFallback:
        'Unable to load activity.',
    },
  )

  /* ---- client view filters ---- */

  const [search, setSearch] = useState('')
  const [personIds, setPersonIds] = useState<
    number[]
  >([])
  const [cameraIds, setCameraIds] = useState<
    number[]
  >([])

  const debouncedSearch = useDebouncedValue(
    search,
    180,
  )

  const allEvents = useMemo(
    () => data ?? [],
    [data],
  )

  const filteredEvents = useMemo(() => {
    const personSet = new Set(personIds)
    const cameraSet = new Set(cameraIds)
    const q = debouncedSearch
      .trim()
      .toLowerCase()

    return allEvents.filter((event) => {
      if (
        personSet.size > 0 &&
        !personSet.has(event.person_id)
      ) {
        return false
      }
      if (
        cameraSet.size > 0 &&
        !cameraSet.has(event.camera_id)
      ) {
        return false
      }
      if (q) {
        const hay = [
          event.person_name,
          event.identifier ?? '',
          formatCnic(event.identifier),
          event.camera_name,
        ]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [
    allEvents,
    personIds,
    cameraIds,
    debouncedSearch,
  ])

  const hasActiveFilters =
    Boolean(startDate) ||
    (Boolean(endDate) && endDate !== today) ||
    debouncedSearch.trim() !== '' ||
    personIds.length > 0 ||
    cameraIds.length > 0

  const clearAll = useCallback(() => {
    setStartDate('')
    setEndDate(today)
    setSearch('')
    setPersonIds([])
    setCameraIds([])
  }, [today])

  const exportFilters: ActivityFilters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search:
      debouncedSearch.trim() || undefined,
    personId:
      personIds.length === 1
        ? personIds[0]
        : undefined,
    cameraId:
      cameraIds.length === 1
        ? cameraIds[0]
        : undefined,
  }

  return {
    events: filteredEvents,
    totalInRange: allEvents.length,
    isLoading,
    error,

    startDate,
    setStartDate,
    endDate,
    setEndDate,
    today,
    rangeInvalid,

    search,
    setSearch,
    activeQuery: debouncedSearch,
    personIds,
    setPersonIds,
    cameraIds,
    setCameraIds,

    hasActiveFilters,
    clearAll,
    exportFilters,
  }
}

export default useActivityFeed
