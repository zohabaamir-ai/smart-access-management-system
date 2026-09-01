import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  TriangleAlert,
} from 'lucide-react'

import Button from '../common/Button'
import { AUTH_INPUT_CLASS } from './AuthCard'

/* =============================================================
   LOGIN FORM

   Username + password, the error / lock-countdown box, and the
   sign-in button. All state and submit logic stay in
   pages/auth/Login.tsx; this component is presentational.
============================================================= */

function formatCountdown(
  totalSeconds: number,
): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s
    .toString()
    .padStart(2, '0')}`
}

type LoginFormProps = {
  username: string
  password: string
  showPassword: boolean
  isLoading: boolean
  isLocked: boolean
  error: string
  remainingSeconds: number | null
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onTogglePassword: () => void
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void
}

function LoginForm({
  username,
  password,
  showPassword,
  isLoading,
  isLocked,
  error,
  remainingSeconds,
  onUsernameChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
}: LoginFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
    >
      <div>
        <label
          htmlFor="username"
          className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) =>
            onUsernameChange(e.target.value)
          }
          placeholder="Your username"
          autoComplete="username"
          autoFocus
          required
          disabled={isLoading}
          className={AUTH_INPUT_CLASS}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={
              showPassword
                ? 'text'
                : 'password'
            }
            value={password}
            onChange={(e) =>
              onPasswordChange(e.target.value)
            }
            placeholder="Your password"
            autoComplete="current-password"
            required
            disabled={isLoading || isLocked}
            className={`${AUTH_INPUT_CLASS} pr-11`}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            disabled={isLoading || isLocked}
            aria-label={
              showPassword
                ? 'Hide password'
                : 'Show password'
            }
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed dark:hover:text-slate-200"
          >
            {showPassword ? (
              <EyeOff size={16} />
            ) : (
              <Eye size={16} />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm leading-5 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          <TriangleAlert
            size={15}
            className="mt-px shrink-0"
          />
          <span>
            {error}
            {isLocked &&
              remainingSeconds !== null && (
                <span className="mt-0.5 block font-medium tabular-nums">
                  Try again in{' '}
                  {formatCountdown(
                    remainingSeconds,
                  )}
                  .
                </span>
              )}
          </span>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading || isLocked}
        icon={
          !isLoading && !isLocked ? (
            <ArrowRight size={16} />
          ) : isLocked ? (
            <LockKeyhole size={15} />
          ) : undefined
        }
      >
        {isLoading
          ? 'Signing in…'
          : isLocked
            ? 'Account locked'
            : 'Sign in'}
      </Button>
    </form>
  )
}

export default LoginForm
