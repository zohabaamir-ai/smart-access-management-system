import {
  useEffect,
  useState,
} from 'react'

/* =============================================================
   useDebouncedValue

   Returns `value` after it has stopped changing for `delayMs`.
   Used to keep live-typed filters responsive without firing a
   request (or an expensive recompute) on every keystroke.
============================================================= */

export function useDebouncedValue<T>(
  value: T,
  delayMs: number,
): T {
  const [debounced, setDebounced] =
    useState<T>(value)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(value)
    }, delayMs)

    return () => window.clearTimeout(id)
  }, [value, delayMs])

  return debounced
}

export default useDebouncedValue
