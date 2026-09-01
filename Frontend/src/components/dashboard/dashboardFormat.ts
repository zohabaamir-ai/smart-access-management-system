/* =============================================================
   DASHBOARD FORMATTERS

   Moved verbatim from pages/dashboard/Dashboard.tsx.
============================================================= */

export function formatDateTime(
  timestamp: string,
) {
  const date = new Date(timestamp)

  return {
    date: date.toLocaleDateString(
      'en-GB',
      {
        timeZone: 'Asia/Karachi',
      },
    ),

    time: date.toLocaleTimeString(
      'en-US',
      {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
      },
    ),
  }
}

export function formatMatchDistance(
  distance: number | null,
) {
  if (distance === null) {
    return '—'
  }

  return distance.toFixed(3)
}
