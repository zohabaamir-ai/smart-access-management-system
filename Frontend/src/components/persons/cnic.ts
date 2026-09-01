/* =============================================================
   CNIC HELPERS

   Moved verbatim from pages/persons/Persons.tsx.
============================================================= */

export function normalizeCnicSearch(
  value: string | null,
) {
  if (!value) {
    return ''
  }

  return value.replace(/\D/g, '')
}

export function formatCnic(
  value: string | null,
) {
  if (!value) {
    return '—'
  }

  const digits = value.replace(
    /\D/g,
    '',
  )

  if (digits.length !== 13) {
    return value
  }

  return `${digits.slice(
    0,
    5,
  )}-${digits.slice(
    5,
    12,
  )}-${digits.slice(12)}`
}
