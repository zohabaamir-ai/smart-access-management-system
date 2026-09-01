import { Check } from 'lucide-react'

import type { InterfaceDensity } from '../../context/AppPreferencesContext'

/* =============================================================
   INTERFACE DENSITY GRID

   Extracted verbatim from settings/GeneralSettings.
============================================================= */

const densityOptions = [
  {
    value: 'comfortable' as const,
    label: 'Comfortable',
    description: 'More spacing for a relaxed interface.',
  },
  {
    value: 'balanced' as const,
    label: 'Balanced',
    description: 'Recommended spacing for everyday use.',
  },
  {
    value: 'compact' as const,
    label: 'Compact',
    description: 'Tighter spacing for dense workflows.',
  },
]

type InterfaceDensityGridProps = {
  value: InterfaceDensity
  onChange: (value: InterfaceDensity) => void
}

function InterfaceDensityGrid({
  value,
  onChange,
}: InterfaceDensityGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {densityOptions.map((option) => {
        const selected =
          value === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() =>
              onChange(option.value)
            }
            className={`rounded-xl border p-4 text-left transition-colors ${
              selected
                ? 'border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-500/10'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {option.label}
              </p>

              {selected && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Check size={13} />
                </span>
              )}
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {option.description}
            </p>
          </button>
        )
      })}
    </div>
  )
}

export default InterfaceDensityGrid
