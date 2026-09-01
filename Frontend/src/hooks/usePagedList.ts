import {
  useEffect,
  useState,
} from 'react'

/* =============================================================
   usePagedList

   "Show more / See less" windowing for a client-side list.
   Renders the first `pageSize` items, grows by `pageSize` on
   showMore, and collapses back on showLess. The window resets
   to `pageSize` whenever `resetKey` (or `pageSize`) changes —
   pass a signature of the active filters so a filter change
   returns to the first page.
============================================================= */

export type PagedList<T> = {
  visible: T[]
  total: number
  shown: number
  canShowMore: boolean
  canShowLess: boolean
  showMore: () => void
  showLess: () => void
}

export function usePagedList<T>(
  items: T[],
  pageSize: number,
  resetKey: unknown,
): PagedList<T> {
  const [count, setCount] =
    useState(pageSize)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(pageSize)
  }, [resetKey, pageSize])

  const total = items.length
  const visible = items.slice(0, count)

  return {
    visible,
    total,
    shown: visible.length,
    canShowMore: count < total,
    canShowLess: count > pageSize,
    showMore: () =>
      setCount((c) => c + pageSize),
    showLess: () => setCount(pageSize),
  }
}

export default usePagedList
