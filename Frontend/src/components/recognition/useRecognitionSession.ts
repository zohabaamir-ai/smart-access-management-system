import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  getRecognitionCamera,
  RecognitionError,
} from '../../services/recognitionService'

import type {
  CameraUnavailableKind,
  RecognitionCamera,
} from './types'

/* =============================================================
   useRecognitionSession

   Resolves "which Camera is this screen" from the URL slug via
   the public GET /cameras/slug/{slug}. No session, no key.

   A backend 404 means one of three things, told apart by the
   detail text: an unknown slug ("Camera not found.") vs a
   camera that exists but is disabled / decommissioned. That
   distinction is surfaced as `unavailableKind`; anything else
   is a generic `error`.

   After the first resolve it re-fetches quietly on an interval
   so a management-side change to `auto_recognition` reaches an
   already-open station within ~REFRESH_MS. A failed re-fetch is
   ignored — the running page is not disturbed (a mid-session
   disable is still handled by the recognition POST returning
   404).
============================================================= */

const REFRESH_MS = 20_000

export function useRecognitionSession(
  slug: string,
) {
  const [camera, setCamera] =
    useState<RecognitionCamera | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] = useState('')

  const [
    unavailableKind,
    setUnavailableKind,
  ] = useState<CameraUnavailableKind | null>(
    null,
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setUnavailableKind(null)

    try {
      const data =
        await getRecognitionCamera(slug)

      setCamera(data)
    } catch (caught) {
      if (
        caught instanceof
          RecognitionError &&
        caught.status === 404
      ) {
        setUnavailableKind(
          /not found/i.test(
            caught.message,
          )
            ? 'notfound'
            : 'unavailable',
        )

        setError(caught.message)
      } else {
        setError(
          caught instanceof Error &&
            caught.message
            ? caught.message
            : 'Unable to load this camera.',
        )
      }
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    // Intentional on-mount fetch: `load` resolves the camera by
    // slug and needs to branch on the error status (404 kind),
    // which the shared useAsyncData hook cannot express. The
    // loading/error transition is one-time per load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // quiet re-resolve so a management-side auto_recognition change
  // reaches an already-open station; failures are swallowed
  useEffect(() => {
    const id = window.setInterval(() => {
      if (
        document.visibilityState !== 'visible'
      ) {
        return
      }
      getRecognitionCamera(slug)
        .then(setCamera)
        .catch(() => {
          /* keep the current state — do not disturb the page */
        })
    }, REFRESH_MS)

    return () => window.clearInterval(id)
  }, [slug])

  return {
    camera,
    loading,
    error,
    unavailableKind,
    reload: load,
  }
}

export default useRecognitionSession
