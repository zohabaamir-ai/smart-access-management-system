import type { ReactNode } from 'react'

/* =============================================================
   FIELD

   Label + control + (error | hint) for one form row. Pairs
   with <Input> / <Select>. Pass `htmlFor` matching the
   control's id so the label is clickable.

   <Field label="Full name" htmlFor="name" error={errors.name}>
     <Input id="name" … />
   </Field>
============================================================= */

type FieldProps = {
  label?: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  /** small right-aligned note in the label row, e.g. "Optional" */
  labelAside?: ReactNode
  children: ReactNode
  className?: string
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  labelAside,
  children,
  className = '',
}: FieldProps) {
  return (
    <div className={className}>
      {(label || labelAside) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && (
            <label
              htmlFor={htmlFor}
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {label}
              {required && (
                <span className="ml-0.5 text-red-500">
                  *
                </span>
              )}
            </label>
          )}

          {labelAside && (
            <span className="text-xs text-slate-500 dark:text-slate-500">
              {labelAside}
            </span>
          )}
        </div>
      )}

      {children}

      {error ? (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export default Field
