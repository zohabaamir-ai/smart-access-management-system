import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { DependencyList } from 'react'

import {
  ApiError,
  isAuthExpired,
} from '../services/api'

/* =============================================================
   useAsyncData

   Query lifecycle for a single async read. Runs `fetcher` on
   mount (and whenever `deps` change or `reload()` is called),
   and owns `data` / `loading` / `error`.

   Owns ONLY the generic lifecycle:
     - try / catch / finally
     - isAuthExpired(err)  -> swallowed, never a visible error
     - ApiError            -> err.detail || apiErrorFallback
     - anything else       -> networkFallback
     - `loading` is true only until the first settle; once
       something has settled, background reload() calls never
       flip it back (no loading flicker)
     - `data` is kept when a reload fails (never auto-cleared)

   Everything domain-specific stays at the call site: the
   service call, the two fallback strings, any polling cadence,
   and any success side effects (perform them inside the
   fetcher).

   const { data, loading, error, reload } = useAsyncData(
     () => someService.getSomething(),
     {
       apiErrorFallback: '...',
       networkFallback: '...',
     },
   )
============================================================= */

type UseAsyncDataOptions = {
  deps?: DependencyList
  apiErrorFallback: string
  networkFallback: string
  enabled?: boolean
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncDataOptions,
): {
  data: T | null
  loading: boolean
  error: string
  reload: () => Promise<void>
} {
  const {
    deps = [],
    apiErrorFallback,
    networkFallback,
    enabled = true,
  } = options

  const [data, setData] =
    useState<T | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  // Latest fetcher, without its identity driving re-runs.
  const fetcherRef = useRef(fetcher)

  useEffect(() => {
    fetcherRef.current = fetcher
  })

  // Governs the no-flicker rule: `loading` only flips to true
  // while nothing has settled yet.
  const settledOnceRef = useRef(false)

  const run = useCallback(async () => {
    if (!settledOnceRef.current) {
      setLoading(true)
    }

    setError('')

    try {
      const result =
        await fetcherRef.current()

      setData(result)
    } catch (err) {
      if (isAuthExpired(err)) {
        return
      }

      setError(
        err instanceof ApiError
          ? err.detail || apiErrorFallback
          : networkFallback,
      )
    } finally {
      settledOnceRef.current = true
      setLoading(false)
    }
  }, [apiErrorFallback, networkFallback])

  const depsKey = JSON.stringify(deps)

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Intentional: this hook exists to run a fetch on mount (and
    // on deps/reload). `run` sets loading/error before awaiting;
    // that is a one-time transition per fetch, not a hot-path
    // cascade. There is no plain-React alternative for on-mount
    // fetching that this rule accepts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run()
  }, [enabled, run, depsKey])

  return {
    data,
    loading,
    error,
    reload: run,
  }
}

export default useAsyncData
