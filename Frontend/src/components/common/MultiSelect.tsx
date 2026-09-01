import {
  useMemo,
  useState,
} from 'react'

import {
  Check,
  ChevronDown,
  Search,
  X,
} from 'lucide-react'

import useDismiss from '../../hooks/useDismiss'

/* =============================================================
   MULTI SELECT

   A searchable, chip-backed multi-select for filter bars.

     · trigger  shows "All …" or "N selected", opens a panel
     · panel    a search box + a scrollable, filtered option list
                with real checkboxes (keyboard usable)
     · chips    the current selection, always visible under the
                trigger, each removable; "Clear all" when 2+

   Scales to long lists: the list is search-narrowed and
   scrolls inside a fixed-height panel.
============================================================= */

export type MultiSelectOption = {
  value: number
  label: string
  /** dimmed secondary text, also searched (e.g. a location/CNIC) */
  hint?: string
}

type MultiSelectProps = {
  id?: string
  options: MultiSelectOption[]
  selected: number[]
  onChange: (next: number[]) => void
  /** trigger text when nothing is selected, e.g. "All persons" */
  allLabel: string
  searchPlaceholder?: string
  /** aria-label for the trigger */
  ariaLabel?: string
  disabled?: boolean
}

function MultiSelect({
  id,
  options,
  selected,
  onChange,
  allLabel,
  searchPlaceholder = 'Search…',
  ariaLabel,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const ref = useDismiss<HTMLDivElement>(
    open,
    () => setOpen(false),
  )

  const selectedSet = useMemo(
    () => new Set(selected),
    [selected],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint ?? '')
          .toLowerCase()
          .includes(q),
    )
  }, [options, query])

  const selectedOptions = useMemo(
    () =>
      options.filter((o) =>
        selectedSet.has(o.value),
      ),
    [options, selectedSet],
  )

  function toggle(value: number) {
    onChange(
      selectedSet.has(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    )
  }

  const triggerText =
    selected.length === 0
      ? allLabel
      : `${selected.length} selected`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() =>
          setOpen((v) => !v)
        }
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
      >
        <span
          className={
            selected.length === 0
              ? 'truncate text-slate-500 dark:text-slate-500'
              : 'truncate text-slate-900 dark:text-white'
          }
        >
          {triggerText}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* chips */}
      {selectedOptions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {selectedOptions.map((o) => (
            <span
              key={o.value}
              className="inline-flex max-w-48 items-center gap-1 rounded-md bg-slate-100 py-0.5 pl-2 pr-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span className="truncate">
                {o.label}
              </span>
              <button
                type="button"
                onClick={() => toggle(o.value)}
                aria-label={`Remove ${o.label}`}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {selectedOptions.length > 1 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded px-1 text-xs font-medium text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* panel */}
      {open && (
        <div className="elevation-1 absolute z-30 mt-1 w-full min-w-56 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div
            role="listbox"
            aria-multiselectable="true"
            className="max-h-60 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-500">
                No matches
              </p>
            ) : (
              filtered.map((o) => {
                const isSel = selectedSet.has(
                  o.value,
                )
                return (
                  <label
                    key={o.value}
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={isSel}
                      onChange={() =>
                        toggle(o.value)
                      }
                    />
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1 ${
                        isSel
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSel && (
                        <Check size={11} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-slate-800 dark:text-slate-100">
                        {o.label}
                      </span>
                      {o.hint && (
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-500">
                          {o.hint}
                        </span>
                      )}
                    </span>
                  </label>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiSelect
