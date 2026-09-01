/* =============================================================
   ACTIVITY LIST FORMATTERS

   Recognition timestamps come from the backend as UTC ISO
   strings; these render them in the viewer's locale, matching
   the rest of the app's date/time convention.
============================================================= */

export function formatDate(
  timestamp: string,
) {
  return new Date(
    timestamp,
  ).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(
  timestamp: string,
) {
  return new Date(
    timestamp,
  ).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCnic(
  value: string | null,
) {
  if (!value) {
    return '—'
  }

  const digits = value.replace(/\D/g, '')

  if (digits.length !== 13) {
    return value
  }

  return `${digits.slice(0, 5)}-${digits.slice(
    5,
    12,
  )}-${digits.slice(12)}`
}
