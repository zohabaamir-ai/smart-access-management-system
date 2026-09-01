import type { ReactNode } from 'react'

/* =============================================================
   HIGHLIGHT

   Renders `text` with every case-insensitive occurrence of
   `query` wrapped in <mark>. The underlying text is never
   altered — only wrapped. Subtle blue tint, readable in both
   themes.

   <Highlight text={person.name} query={search} />
============================================================= */

const MARK_CLASS =
  'rounded-[2px] bg-blue-100 px-0.5 text-blue-900 dark:bg-blue-500/25 dark:text-blue-100'

type HighlightProps = {
  text: string
  query: string
}

function Highlight({
  text,
  query,
}: HighlightProps) {
  const q = query.trim()

  if (!q || !text) {
    return <>{text}</>
  }

  const haystack = text.toLowerCase()
  const needle = q.toLowerCase()

  const parts: ReactNode[] = []
  let cursor = 0
  let match = haystack.indexOf(needle, cursor)
  let key = 0

  while (match !== -1) {
    if (match > cursor) {
      parts.push(
        text.slice(cursor, match),
      )
    }
    parts.push(
      <mark
        key={key++}
        className={MARK_CLASS}
      >
        {text.slice(
          match,
          match + q.length,
        )}
      </mark>,
    )
    cursor = match + q.length
    match = haystack.indexOf(needle, cursor)
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }

  return <>{parts}</>
}

export default Highlight
