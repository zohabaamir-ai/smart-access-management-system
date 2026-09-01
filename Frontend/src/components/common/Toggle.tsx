/* =============================================================
   TOGGLE

   Shared on/off switch. Extracted verbatim from
   settings/GeneralSettings so every "switch" in the app uses
   one implementation.
============================================================= */

type ToggleProps = {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  'aria-label'?: string
}

function Toggle({
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked
          ? 'bg-slate-900 dark:bg-white'
          : 'bg-slate-200 dark:bg-slate-700'
      } ${
        disabled
          ? 'cursor-not-allowed opacity-50'
          : ''
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
          checked ? 'left-6' : 'left-1'
        } ${
          checked
            ? 'dark:bg-slate-900'
            : ''
        }`}
      />
    </button>
  )
}

export default Toggle
