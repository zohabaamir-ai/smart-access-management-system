/* =============================================================
   PERSON LIST FORMATTERS

   Moved verbatim from pages/persons/Persons.tsx.
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
