import {
  Check,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react'

import type { ThemePreference } from '../../context/AppPreferencesContext'

/* =============================================================
   THEME OPTION GRID

   Extracted verbatim from settings/GeneralSettings.
============================================================= */

type ThemeOption = {
  value: ThemePreference
  label: string
  description: string
  icon: typeof Sun
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Use the light application theme.',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Use the dark application theme.',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow your device appearance setting.',
    icon: Monitor,
  },
]

type ThemeOptionGridProps = {
  value: ThemePreference
  onChange: (value: ThemePreference) => void
}

function ThemeOptionGrid({
  value,
  onChange,
}: ThemeOptionGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {themeOptions.map((option) => {
        const Icon = option.icon
        const selected =
          value === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() =>
              onChange(option.value)
            }
            className={`relative rounded-xl border p-4 text-left transition-colors ${
              selected
                ? 'border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-500/10'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60'
            }`}
          >
            {selected && (
              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                <Check size={13} />
              </span>
            )}

            <Icon
              size={20}
              className={
                selected
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-300'
              }
            />

            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
              {option.label}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {option.description}
            </p>
          </button>
        )
      })}
    </div>
  )
}

export default ThemeOptionGrid
