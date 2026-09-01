import { Check } from 'lucide-react'

/* =============================================================
   PASSWORD REQUIREMENT ROW

   A single "rule met / not met" line with a check bubble.
   Extracted verbatim from ChangePassword.tsx so any password
   form can list the same requirements.
============================================================= */

type PasswordRequirementRowProps = {
  met: boolean
  label: string
}

function PasswordRequirementRow({
  met,
  label,
}: PasswordRequirementRowProps) {
  return (
    <div className="mt-1 flex items-center gap-2 text-xs">

      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full ${
          met
            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
        }`}
      >

        <Check
          size={10}
        />

      </span>


      <span className="text-slate-500 dark:text-slate-400">

        {label}

      </span>

    </div>
  )
}

export default PasswordRequirementRow
