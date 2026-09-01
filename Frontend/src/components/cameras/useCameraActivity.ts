import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { isAuthExpired } from '../../services/api'
import {
  getActivity,
  type ActivityEvent,
} from '../../services/activityService'

/* =============================================================
   useCameraActivity

   Polls "recent recognitions at this camera" while the Open
   Camera view is mounted. Read-only — GET /activity?camera_id.
   `bump()` lets the caller refresh right after a local match.
============================================================= */

const POLL_MS = 15_000
const LIMIT = 10

export function useCameraActivity(
  cameraId: number,
) {
  const [events, setEvents] = useState<
    ActivityEvent[]
  >([])
  const [loaded, setLoaded] =
    useState(false)

  const inFlight = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current) {
      return
    }
    inFlight.current = true

    try {
      const data = await getActivity({
        cameraId,
      })
      setEvents(data.slice(0, LIMIT))
    } catch (caught) {
      if (isAuthExpired(caught)) {
        return
      }
      // recent activity is supplemental — stay quiet on failure
    } finally {
      inFlight.current = false
      setLoaded(true)
    }
  }, [cameraId])

  useEffect(() => {
    // Intentional on-mount fetch (same pattern as useAsyncData).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()

    const id = window.setInterval(() => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        load()
      }
    }, POLL_MS)

    return () =>
      window.clearInterval(id)
  }, [load])

  return { events, loaded, refresh: load }
}

export default useCameraActivity
