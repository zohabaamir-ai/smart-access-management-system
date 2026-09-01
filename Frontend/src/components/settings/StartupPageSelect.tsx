import Select from '../common/Select'

import type { StartupPage } from '../../context/AppPreferencesContext'

/* =============================================================
   STARTUP PAGE SELECT
============================================================= */

type StartupPageSelectProps = {
  value: StartupPage
  onChange: (value: StartupPage) => void
}

function StartupPageSelect({
  value,
  onChange,
}: StartupPageSelectProps) {
  return (
    <div>
      <label
        htmlFor="startup-page"
        className="text-sm font-medium text-slate-900 dark:text-white"
      >
        Startup page
      </label>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Where the app opens after you sign in.
      </p>

      <div className="mt-3 max-w-xs">
        <Select
          id="startup-page"
          value={value}
          onChange={(e) =>
            onChange(
              e.target.value as StartupPage,
            )
          }
        >
          <option value="/dashboard">
            Dashboard
          </option>
          <option value="/persons">
            Persons
          </option>
          <option value="/cameras">
            Cameras
          </option>
          <option value="/activity">
            Activity
          </option>
          <option value="/settings">
            Settings
          </option>
        </Select>
      </div>
    </div>
  )
}

export default StartupPageSelect
