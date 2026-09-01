import type { ReactNode } from 'react'

import { useState } from 'react'

import { Eye, EyeOff } from 'lucide-react'

import { AUTH_INPUT_CLASS } from './AuthCard'

/* =============================================================
   PASSWORD FIELD

   Label + password input + show/hide toggle. Used by every
   Change Password field. Owns its own visibility state so each
   field toggles independently. `children` renders directly
   under the input (requirement rows, match hints).
============================================================= */

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  visibilityLabel: string
  autoComplete?: string
  required?: boolean
  disabled?: boolean
  children?: ReactNode
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visibilityLabel,
  autoComplete,
  required = false,
  disabled = false,
  children,
}: PasswordFieldProps) {
  const [visible, setVisible] =
    useState(false)

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={`${AUTH_INPUT_CLASS} pr-11`}
        />

        <button
          type="button"
          onClick={() =>
            setVisible((current) => !current)
          }
          disabled={disabled}
          aria-label={`${
            visible ? 'Hide' : 'Show'
          } ${visibilityLabel}`}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed dark:hover:text-slate-200"
        >
          {visible ? (
            <EyeOff size={16} />
          ) : (
            <Eye size={16} />
          )}
        </button>
      </div>

      {children}
    </div>
  )
}

export default PasswordField
