import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  ApiError,
  isAuthExpired,
} from '../../services/api'
import {
  getCameras,
  type Camera,
} from '../../services/cameraService'

import { CamerasContext } from './CamerasContext'
import { readActiveSessionSlugs } from './cameraSessions'

/* =============================================================
   CAMERAS PROVIDER

   - loads GET /cameras and revalidates on a short interval while
     visible. The camera `status` in that response is the
     authoritative cross-device ONLINE/OFFLINE signal (backend
     recognition-session heartbeat), so the poll doubles as the
     presence refresh.
   - also tracks same-browser localStorage heartbeats as an
     immediate fallback (cross-tab storage events + a short poll).
============================================================= */

const REVALIDATE_MS = 15_000
const SESSION_POLL_MS = 4_000

function CamerasProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [cameras, setCameras] = useState<
    Camera[]
  >([])
  const [isLoading, setIsLoading] =
    useState(true)
  const [error, setError] = useState('')
  const [
    activeSessionSlugs,
    setActiveSessionSlugs,
  ] = useState<Set<string>>(
    () => new Set(),
  )

  const settledRef = useRef(false)

  const reload = useCallback(async () => {
    if (!settledRef.current) {
      setIsLoading(true)
    }
    setError('')

    try {
      const data = await getCameras()
      setCameras(data)
    } catch (caught) {
      if (isAuthExpired(caught)) return
      setError(
        caught instanceof ApiError
          ? caught.detail ||
              'Unable to load cameras.'
          : 'Unable to connect to the access management server.',
      )
    } finally {
      settledRef.current = true
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Intentional on-mount fetch (same pattern as useAsyncData).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()

    const interval = window.setInterval(() => {
      if (
        document.visibilityState === 'visible'
      ) {
        reload()
      }
    }, REVALIDATE_MS)

    return () =>
      window.clearInterval(interval)
  }, [reload])

  // session presence: poll the localStorage heartbeats and
  // react to cross-tab changes
  useEffect(() => {
    const sync = () => {
      const next = readActiveSessionSlugs()
      setActiveSessionSlugs((prev) => {
        if (
          prev.size === next.size &&
          [...next].every((s) => prev.has(s))
        ) {
          return prev
        }
        return next
      })
    }

    sync()
    const id = window.setInterval(
      sync,
      SESSION_POLL_MS,
    )
    window.addEventListener('storage', sync)

    return () => {
      window.clearInterval(id)
      window.removeEventListener(
        'storage',
        sync,
      )
    }
  }, [])

  return (
    <CamerasContext.Provider
      value={{
        cameras,
        isLoading,
        error,
        reload,
        setCameras,
        activeSessionSlugs,
      }}
    >
      {children}
    </CamerasContext.Provider>
  )
}

export default CamerasProvider
