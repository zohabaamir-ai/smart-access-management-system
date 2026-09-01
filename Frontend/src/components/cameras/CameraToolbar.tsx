import {
  LayoutGrid,
  List,
  Search,
} from 'lucide-react'

import Input from '../common/Input'

import type {
  CameraStatusFilter,
  CameraView,
} from './types'

/* =============================================================
   CAMERA TOOLBAR

   Search · status filter · grid/list view toggle.
============================================================= */

const STATUS_OPTIONS: {
  value: CameraStatusFilter
  label: string
}[] = [
  { value: 'all', label: 'All' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'disabled', label: 'Disabled' },
]

type Props = {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: CameraStatusFilter
  onStatusFilterChange: (
    value: CameraStatusFilter,
  ) => void
  view: CameraView
  onViewChange: (value: CameraView) => void
}

function CameraToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  view,
  onViewChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="w-full sm:max-w-xs">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) =>
            onSearchChange(e.target.value)
          }
          onClear={() => onSearchChange('')}
          clearLabel="Clear search"
          placeholder="Name, location or slug"
          icon={<Search size={15} />}
        />
      </div>

      <div className="flex items-center gap-2">
        {/* status segmented control */}
        <div
          role="tablist"
          aria-label="Filter by status"
          className="flex h-9 items-center rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900"
        >
          {STATUS_OPTIONS.map((opt) => {
            const active =
              statusFilter === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() =>
                  onStatusFilterChange(
                    opt.value,
                  )
                }
                className={`h-8 rounded px-2.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* view toggle */}
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

export default CameraToolbar
