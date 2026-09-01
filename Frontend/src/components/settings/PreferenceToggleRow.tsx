import Toggle from '../common/Toggle'

/* =============================================================
   PREFERENCE TOGGLE ROW

   The "label + description on the left, switch on the right"
   row used repeatedly in settings. Extracted verbatim from
   settings/GeneralSettings.
============================================================= */

type PreferenceToggleRowProps = {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}

function PreferenceToggleRow({
  title,
  description,
  checked,
  onChange,
}: PreferenceToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-5">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          {title}
        </p>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <Toggle
        checked={checked}
        onChange={onChange}
      />
    </div>
  )
}

export default PreferenceToggleRow
