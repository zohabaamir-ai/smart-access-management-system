/* =============================================================
   CAMERA LIST FORMATTERS
============================================================= */

// The public, unattended recognition URL for a camera's slug.
export function publicRecognitionUrl(
  slug: string,
): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : ''

  return `${origin}/recognition/camera/${slug}`
}

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
