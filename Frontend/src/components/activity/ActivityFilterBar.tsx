import { Search, X } from 'lucide-react'

import useAsyncData from '../../hooks/useAsyncData'
import { getPersons } from '../../services/personService'
import useCameras from '../../context/cameras/useCameras'

import Field from '../common/Field'
import Input from '../common/Input'
import Button from '../common/Button'
import MultiSelect from '../common/MultiSelect'
import type { MultiSelectOption } from '../common/MultiSelect'

import { formatCnic } from './activityFormat'

/* =============================================================
   ACTIVITY FILTER BAR

   Date range (server-side, debounced) + searchable multi-select
   Person and Camera filters + a live text search. Everything
   applies immediately — no "Apply". "Clear filters" resets the
   whole set back to the default (all activity up to today).
============================================================= */

type Props = {
  startDate: string
  endDate: string
  rangeInvalid: boolean
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void

  search: string
  onSearchChange: (value: string) => void

  personIds: number[]
  onPersonIdsChange: (value: number[]) => void
  cameraIds: number[]
  onCameraIdsChange: (value: number[]) => void

  hasActiveFilters: boolean
  onClearAll: () => void

  isLoading: boolean
}

function ActivityFilterBar({
  startDate,
  endDate,
  rangeInvalid,
  onStartDateChange,
  onEndDateChange,
  search,
  onSearchChange,
  personIds,
  onPersonIdsChange,
  cameraIds,
  onCameraIdsChange,
  hasActiveFilters,
  onClearAll,
  isLoading,
}: Props) {
  const { cameras } = useCameras()

  const { data: persons } = useAsyncData(
    () => getPersons(),
    {
      apiErrorFallback:
        'Failed to load persons.',
      networkFallback:
        'Failed to load persons.',
    },
  )

  const personOptions: MultiSelectOption[] = (
    persons ?? []
  ).map((p) => ({
    value: p.id,
    label: p.name,
    hint: p.identifier
      ? formatCnic(p.identifier)
      : undefined,
  }))

  const cameraOptions: MultiSelectOption[] =
    cameras.map((c) => ({
      value: c.id,
      label: c.name,
      hint: c.location || undefined,
    }))

  return (
    <div>
      <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="From" htmlFor="act-from">
          <Input
            id="act-from"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) =>
              onStartDateChange(e.target.value)
            }
          />
        </Field>

        <Field
          label="To"
          htmlFor="act-to"
          error={
            rangeInvalid
              ? 'The end date is before the start date.'
              : undefined
          }
        >
          <Input
            id="act-to"
            type="date"
            value={endDate}
            min={startDate || undefined}
            invalid={rangeInvalid}
            onChange={(e) =>
              onEndDateChange(e.target.value)
            }
          />
        </Field>

        <Field label="Person">
          <MultiSelect
            ariaLabel="Filter by person"
            options={personOptions}
            selected={personIds}
            onChange={onPersonIdsChange}
            allLabel="All persons"
            searchPlaceholder="Search people…"
          />
        </Field>

        <Field label="Camera">
          <MultiSelect
            ariaLabel="Filter by camera"
            options={cameraOptions}
            selected={cameraIds}
            onChange={onCameraIdsChange}
            allLabel="All cameras"
            searchPlaceholder="Search cameras…"
          />
        </Field>

        <Field
          label="Search"
          htmlFor="act-search"
          className="sm:col-span-2 lg:col-span-4"
        >
          <Input
            id="act-search"
            type="text"
            value={search}
            onChange={(e) =>
              onSearchChange(e.target.value)
            }
            onClear={() => onSearchChange('')}
            clearLabel="Clear search"
            placeholder="Person name, CNIC or camera"
            icon={<Search size={15} />}
          />
        </Field>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={<X size={15} />}
          onClick={onClearAll}
          disabled={
            isLoading || !hasActiveFilters
          }
        >
          Clear filters
        </Button>
      </div>
    </div>
  )
}

export default ActivityFilterBar
