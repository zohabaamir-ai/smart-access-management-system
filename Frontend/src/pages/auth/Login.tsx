import {
  useEffect,
  useState,
} from 'react'

import { useNavigate } from 'react-router-dom'

import { getTokenPayload } from '../../services/auth'
import { login } from '../../services/authService'
import { getStoredStartupPage } from '../../context/appPreferences/storage'

import AuthCard from '../../components/auth/AuthCard'
import LoginForm from '../../components/auth/LoginForm'

/* =============================================================
   LOGIN

   One focused, theme-aware card — a direct entry point into the
   Access Management console. The temporary account-lock
   countdown is driven only by a real 423 from POST /auth/login.
   Authentication logic is unchanged.
============================================================= */

function Login() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] =
    useState(false)
  const [isLoading, setIsLoading] =
    useState(false)
  const [error, setError] = useState('')
  const [lockedUntil, setLockedUntil] =
    useState<Date | null>(null)
  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState<number | null>(null)

  useEffect(() => {
    if (!lockedUntil) return

    const unlockTime = lockedUntil.getTime()

    function tick() {
      const diff = unlockTime - Date.now()
      if (diff <= 0) {
        setLockedUntil(null)
        setRemainingSeconds(null)
        setError(
          'You can try signing in again now.',
        )
        return
      }
      setRemainingSeconds(
        Math.ceil(diff / 1000),
      )
    }

    tick()
    const interval = window.setInterval(
      tick,
      1000,
    )
    return () =>
      window.clearInterval(interval)
  }, [lockedUntil])

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await login({
        username: username.trim(),
        password,
      })
      const data = await response.json()

      if (!response.ok) {
        const detail =
          typeof data.detail === 'object' &&
          data.detail !== null
            ? data.detail
            : null

        if (
          response.status === 423 &&
          detail?.code ===
            'ACCOUNT_TEMPORARILY_LOCKED'
        ) {
          if (detail.locked_until) {
            const lockedDate = new Date(
              detail.locked_until,
            )
            setLockedUntil(lockedDate)
            setRemainingSeconds(
              Math.max(
                0,
                Math.ceil(
                  (lockedDate.getTime() -
                    Date.now()) /
                    1000,
                ),
              ),
            )
          }
          setError(
            'Account temporarily locked.',
          )
          return
        }

        if (response.status === 401) {
          setError(
            detail?.message ||
              'Invalid username or password.',
          )
          return
        }

        if (response.status === 403) {
          setError(
            detail?.message ||
              'This account has been disabled by an administrator.',
          )
          return
        }

        setError(
          detail?.message ||
            'Unable to sign in. Please try again.',
        )
        return
      }

      setLockedUntil(null)
      setRemainingSeconds(null)
      localStorage.setItem(
        'access_token',
        data.access_token,
      )

      const payload = getTokenPayload()
      if (
        payload?.must_change_password === true
      ) {
        navigate('/change-password', {
          replace: true,
        })
        return
      }

      navigate(getStoredStartupPage(), {
        replace: true,
      })
    } catch {
      setError(
        'Unable to connect to the access management server.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleUsernameChange(
    value: string,
  ) {
    setUsername(value)
    setLockedUntil(null)
    setRemainingSeconds(null)
    setError('')
  }

  const isLocked =
    lockedUntil !== null &&
    remainingSeconds !== null &&
    remainingSeconds > 0

  return (
    <AuthCard
      showcase
      title={
        <>
          Sign in to Smart{' '}
          <span className="text-blue-600 dark:text-blue-400">
            Access
          </span>
        </>
      }
      subtitle="Enter your credentials to continue."
      footer="Forgot your password? Contact your administrator to have it reset."
    >
      <LoginForm
        username={username}
        password={password}
        showPassword={showPassword}
        isLoading={isLoading}
        isLocked={isLocked}
        error={error}
        remainingSeconds={remainingSeconds}
        onUsernameChange={handleUsernameChange}
        onPasswordChange={setPassword}
        onTogglePassword={() =>
          setShowPassword((v) => !v)
        }
        onSubmit={handleLogin}
      />
    </AuthCard>
  )
}

export default Login
