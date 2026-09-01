import {
  LayoutGrid,
  List,
  Search,
} from 'lucide-react'

import Input from '../common/Input'
import Select from '../common/Select'

import type {
  PersonView,
  SortOption,
} from './types'

/* =============================================================
   PERSON DIRECTORY TOOLBAR

   Search by name / CNIC · sort · card-grid vs table toggle.
============================================================= */

type PersonDirectoryToolbarProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  sortOption: SortOption
  onSortChange: (value: SortOption) => void
  view: PersonView
  onViewChange: (value: PersonView) => void
}

function PersonDirectoryToolbar({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  view,
  onViewChange,
}: PersonDirectoryToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="w-full sm:max-w-xs">
        <Input
          type="text"
          value={searchQuery}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          onClear={() => onSearchChange('')}
          clearLabel="Clear search"
          placeholder="Name or CNIC"
          icon={<Search size={15} />}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="w-40">
          <Select
            value={sortOption}
            onChange={(event) =>
              onSortChange(
                event.target
                  .value as SortOption,
              )
            }
            aria-label="Sort persons"
          >
            <option value="newest">
              Newest first
            </option>
            <option value="oldest">
              Oldest first
            </option>
            <option value="name-asc">
              Name A–Z
            </option>
            <option value="name-desc">
              Name Z–A
            </option>
          </Select>
        </div>

        <div className="flex h-9 items-center rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
          {(
            [
              ['grid', LayoutGrid],
              ['list', List],
            ] as const
          ).map(([value, Icon]) => {
            const active = view === value
            return (
              <button
                key={value}
                type="button"
                aria-label={`${value} view`}
                aria-pressed={active}
                onClick={() =>
                  onViewChange(value)
                }
                className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
                  active
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={15} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PersonDirectoryToolbar
