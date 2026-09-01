import { useState } from 'react'

import { RefreshCw } from 'lucide-react'

import {
  ApiError,
  isAuthExpired,
} from '../../services/api'
import {
  getSystemSettings,
  updateSystemSettings,
  type SystemSettingKey,
  type SystemSettingValue,
} from '../../services/settingsService'

import useAsyncData from '../../hooks/useAsyncData'
import useToast from '../common/toast/useToast'

import Card from '../common/Card'
import Alert from '../common/Alert'
import Button from '../common/Button'
import Input from '../common/Input'
import Skeleton from '../common/Skeleton'

/* =============================================================
   SYSTEM SETTINGS  (Super Admin only)

   The finalized B9 catalog: exactly two runtime thresholds,
   read from and written to GET/PUT /settings/system. The
   backend owns the catalog, defaults, ranges and validation;
   this UI renders what the API returns and submits one atomic
   Save. No System Health, no other keys.
============================================================= */

const RENDERED: {
  key: SystemSettingKey
  label: string
}[] = [
  {
    key: 'recognition_match_threshold',
    label: 'Recognition match threshold',
  },
  {
    key: 'duplicate_face_match_threshold',
    label: 'Duplicate face threshold',
  },
]

function formatValue(
  value: SystemSettingValue['value'],
): string {
  return String(value)
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })} ${date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function validate(
  raw: string,
  spec: SystemSettingValue,
): string {
  const trimmed = raw.trim()
  if (!trimmed) return 'Enter a value.'
  const parsed = Number(trimmed)
  if (Number.isNaN(parsed))
    return 'Enter a valid number.'
  if (!Number.isFinite(parsed))
    return 'Enter a finite number.'
  if (
    spec.minimum != null &&
    parsed < spec.minimum
  )
    return `Must be at least ${spec.minimum}.`
  if (
    spec.maximum != null &&
    parsed > spec.maximum
  )
    return `Must be at most ${spec.maximum}.`
  return ''
}

function SystemSettings() {
  const toast = useToast()

  const {
    data: settings,
    loading: isLoading,
    error: loadError,
    reload,
  } = useAsyncData(
    () => getSystemSettings(),
    {
      apiErrorFallback:
        'Unable to load system settings.',
      networkFallback:
        'Unable to connect to the access management server.',
    },
  )

  const [draft, setDraft] = useState<
    Record<string, string>
  >({})
  const [fieldErrors, setFieldErrors] =
    useState<Record<string, string>>({})
  const [isSaving, setIsSaving] =
    useState(false)
  const [saveError, setSaveError] =
    useState('')

  function inputValue(
    key: SystemSettingKey,
  ): string {
    const override = draft[key]
    if (override !== undefined) return override
    const spec = settings?.[key]
    return spec ? formatValue(spec.value) : ''
  }

  function handleChange(
    key: SystemSettingKey,
    next: string,
  ) {
    setDraft((current) => ({
      ...current,
      [key]: next,
    }))
    setFieldErrors((current) => {
      if (!current[key]) return current
      const copy = { ...current }
      delete copy[key]
      return copy
    })
  }

  const hasChanges =
    settings != null &&
    RENDERED.some(({ key }) => {
      const spec = settings[key]
      const override = draft[key]
      return (
        spec != null &&
        override !== undefined &&
        override.trim() !== '' &&
        Number(override) !==
          Number(spec.value)
      )
    })

  async function handleSave() {
    if (!settings) return

    const nextErrors: Record<string, string> =
      {}
    const updates: Partial<
      Record<SystemSettingKey, number>
    > = {}

    for (const { key } of RENDERED) {
      const spec = settings[key]
      if (!spec) continue
      const raw = inputValue(key)
      const err = validate(raw, spec)
      if (err) {
        nextErrors[key] = err
        continue
      }
      const parsed = Number(raw)
      if (parsed !== Number(spec.value))
        updates[key] = parsed
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setSaveError('')
      return
    }
    if (Object.keys(updates).length === 0)
      return

    setIsSaving(true)
    setSaveError('')
    setFieldErrors({})
    try {
      await updateSystemSettings(updates)
      setDraft({})
      toast.show({
        message:
          'System settings saved — applied to the next recognition and enrollment',
      })
      await reload()
    } catch (caught) {
      if (isAuthExpired(caught)) return
      setSaveError(
        caught instanceof ApiError
          ? caught.detail ||
              'Unable to save system settings.'
          : 'Unable to connect to the access management server.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="mt-4 h-24 w-full" />
        <Skeleton className="mt-3 h-24 w-full" />
      </Card>
    )
  }

  if (loadError || !settings) {
    return (
      <Card className="space-y-4 p-6">
        <Alert variant="error">
          {loadError ||
            'Unable to load system settings.'}
        </Alert>
        <Button
          variant="secondary"
          icon={<RefreshCw size={15} />}
          onClick={() => reload()}
        >
          Retry
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {saveError && (
        <Alert
          variant="error"
          onDismiss={() => setSaveError('')}
        >
          {saveError}
        </Alert>
      )}

      <Card
        title="Recognition & enrollment"
        description="Runtime thresholds used by the recognition and enrollment services. No restart required."
        bodyClassName="p-0"
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {RENDERED.map(({ key, label }) => {
            const spec = settings[key]
            if (!spec) return null
            const fieldError = fieldErrors[key]
            const raw = inputValue(key)
            const isDefault =
              raw.trim() !== '' &&
              Number(raw) ===
                Number(spec.default)

            return (
              <div
                key={key}
                className="px-6 py-5"
              >
                <label
                  htmlFor={`setting-${key}`}
                  className="text-sm font-medium text-slate-900 dark:text-white"
                >
                  {label}
                </label>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {spec.description}
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <div className="max-w-44 flex-1">
                    <Input
                      id={`setting-${key}`}
                      type="number"
                      inputMode="decimal"
                      step={0.05}
                      min={
                        spec.minimum ??
                        undefined
                      }
                      max={
                        spec.maximum ??
                        undefined
                      }
                      value={inputValue(key)}
                      onChange={(e) =>
                        handleChange(
                          key,
                          e.target.value,
                        )
                      }
                      disabled={isSaving}
                      invalid={Boolean(
                        fieldError,
                      )}
                    />
                  </div>

                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() =>
                        handleChange(
                          key,
                          formatValue(
                            spec.default,
                          ),
                        )
                      }
                      disabled={isSaving}
                      className="shrink-0 rounded text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Restore default
                    </button>
                  )}
                </div>

                {fieldError && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {fieldError}
                  </p>
                )}

                <p className="tnum mt-2 text-xs text-slate-500 dark:text-slate-500">
                  Default{' '}
                  {formatValue(spec.default)}
                  {spec.minimum != null &&
                  spec.maximum != null
                    ? ` · Range ${spec.minimum}–${spec.maximum}`
                    : ''}
                  {' · '}
                  {spec.updated_at
                    ? `Updated ${formatUpdatedAt(spec.updated_at)}`
                    : 'Using the default'}
                </p>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <Button
            onClick={handleSave}
            loading={isSaving}
            disabled={!hasChanges || isSaving}
          >
            Save changes
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default SystemSettings
