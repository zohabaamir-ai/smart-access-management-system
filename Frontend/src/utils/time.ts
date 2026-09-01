/* =============================================================
   TIME HELPERS
============================================================= */

// "just now" / "3 min ago" / "2 h ago" / "yesterday" / a date
export function formatRelativeTime(
  iso: string | null | undefined,
): string {
  if (!iso) {
    return '—'
  }

  const then = new Date(iso).getTime()

  if (Number.isNaN(then)) {
    return '—'
  }

  const diff = Date.now() - then
  const sec = Math.round(diff / 1000)

  if (sec < 45) {
    return 'just now'
  }

  const min = Math.round(sec / 60)
  if (min < 60) {
    return `${min} min ago`
  }

  const hr = Math.round(min / 60)
  if (hr < 24) {
    return `${hr} h ago`
  }

  const day = Math.round(hr / 24)
  if (day === 1) {
    return 'yesterday'
  }
  if (day < 7) {
    return `${day} days ago`
  }

  return new Date(iso).toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
    },
  )
}

export function formatClockTime(
  iso: string | null | undefined,
): string {
  if (!iso) {
    return '—'
  }

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}
