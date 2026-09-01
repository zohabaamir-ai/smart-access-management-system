import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  TriangleAlert,
  X,
} from 'lucide-react'

import AuthCard from '../../components/auth/AuthCard'
import PasswordField from '../../components/auth/PasswordField'
import PasswordRequirementRow from '../../components/auth/PasswordRequirementRow'
import Button from '../../components/common/Button'
import Alert from '../../components/common/Alert'

import { getTokenPayload } from '../../services/auth'
import {
  ApiError,
  isAuthExpired,
} from '../../services/api'
import { changePassword } from '../../services/authService'

/* =============================================================
   CHANGE PASSWORD

   The same focused auth card as Login, one step further in. Two
   entry points, one screen:
     - forced:    the account is flagged must_change_password
     - voluntary: reached from Settings › Security
   Authentication logic is unchanged.
============================================================= */

function ChangePassword() {
  const navigate = useNavigate()

  const tokenPayload = getTokenPayload()
  const forced =
    tokenPayload?.must_change_password === true

  const [currentPassword, setCurrentPassword] =
    useState('')
  const [newPassword, setNewPassword] =
    useState('')
  const [confirmPassword, setConfirmPassword] =
    useState('')
  const [isLoading, setIsLoading] =
    useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const lengthOk = newPassword.length >= 8
  const matchOk =
    confirmPassword.length > 0 &&
    newPassword === confirmPassword
  const showMismatch =
    confirmPassword.length > 0 &&
    newPassword !== confirmPassword

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setError(
        'New password must be at least 8 characters.',
      )
      return
    }

    const token = localStorage.getItem(
      'access_token',
    )
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    setIsLoading(true)
    try {
      const data = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })

      if (!data.access_token) {
        setError(
          'Password changed, but the server did not return a new session token.',
        )
        return
      }

      localStorage.setItem(
        'access_token',
        data.access_token,
      )

      const newPayload = getTokenPayload()
      if (
        !newPayload ||
        newPayload.must_change_password
      ) {
        setError(
          'Password changed, but the new session is still marked for a password change.',
        )
        return
      }

      setSuccess(
        'Password changed. Redirecting…',
      )
      window.setTimeout(() => {
        navigate(
          forced ? '/dashboard' : '/settings',
          { replace: true },
        )
      }, 700)
    } catch (caught) {
      if (isAuthExpired(caught)) return
      setError(
        caught instanceof ApiError
          ? caught.detail ||
              'Unable to change password.'
          : 'Unable to connect to the access management server.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthCard
      compact
      title={
        forced
          ? 'Set a new password'
          : 'Change your password'
      }
      subtitle={
        forced
          ? 'Replace your temporary password to continue.'
          : 'Choose a new password for your account.'
      }
      notice={
        forced && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/20">
            <TriangleAlert
              size={14}
              className="mt-px shrink-0 text-amber-600 dark:text-amber-400"
            />
            <p className="text-xs leading-5 text-amber-800 dark:text-amber-300">
              A password update is required
              before you can continue.
            </p>
          </div>
        )
      }
      footer={
        forced ? undefined : (
          <>
            Changed your mind?{' '}
            <button
              type="button"
              onClick={() =>
                navigate('/settings')
              }
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Back to settings
            </button>
          </>
        )
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-3.5"
      >
        <PasswordField
          id="current-password"
          label={
            forced
              ? 'Temporary password'
              : 'Current password'
          }
          value={currentPassword}
          onChange={setCurrentPassword}
          visibilityLabel={
            forced
              ? 'temporary password'
              : 'current password'
          }
          autoComplete="current-password"
          required
          disabled={isLoading}
        />

        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          visibilityLabel="new password"
          autoComplete="new-password"
          required
          disabled={isLoading}
        >
          <PasswordRequirementRow
            met={lengthOk}
            label="At least 8 characters"
          />
        </PasswordField>

        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          visibilityLabel="password confirmation"
          autoComplete="new-password"
          required
          disabled={isLoading}
        >
          {matchOk && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <Check size={13} />
              Passwords match
            </p>
          )}
          {showMismatch && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <X size={13} />
              Passwords do not match
            </p>
          )}
        </PasswordField>

        {error && (
          <Alert variant="error">{error}</Alert>
        )}
        {success && (
          <Alert variant="success">
            {success}
          </Alert>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={
            isLoading || !lengthOk || !matchOk
          }
        >
          {isLoading
            ? forced
              ? 'Setting password…'
              : 'Changing password…'
            : forced
              ? 'Set password'
              : 'Change password'}
        </Button>
      </form>
    </AuthCard>
  )
}

export default ChangePassword
