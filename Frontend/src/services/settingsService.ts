import { request } from './api'

/* =============================================================
   SETTINGS SERVICE

   The finalized B9 System Settings surface. Super Admin only
   (backend gates GET and PUT with MANAGE_SETTINGS). Uses the
   authenticated request() transport — never publicFetch.

   Backend contract (app/api/routes/settings_routes.py,
   app/schemas/settings_schemas.py):

     GET  /settings/system  -> SystemSettingsResponse
     PUT  /settings/system  -> SystemSettingsResponse
       body: { settings: { <key>: <value>, ... } }

   The backend owns the catalog: exactly two keys in V1
   (recognition_match_threshold, duplicate_face_match_threshold),
   both float, range 0.1–2.0. Unknown keys are rejected with
   400. updated_by is set from the authenticated Super Admin and
   must never be sent by the client.
============================================================= */

export type SystemSettingKey =
  | 'recognition_match_threshold'
  | 'duplicate_face_match_threshold'

// One entry of GET /settings/system, mirroring
// settings_schemas.py :: SystemSettingValue. For the two V1
// keys `value` / `default` are always numbers; the wider union
// matches the general backend schema.
export interface SystemSettingValue {
  value: number | string | boolean
  default: number | string | boolean
  type: string
  description: string
  minimum: number | null
  maximum: number | null
  updated_at: string | null
  updated_by: number | null
}

export type SystemSettings = Record<
  string,
  SystemSettingValue
>

export interface SystemSettingsResponse {
  settings: SystemSettings
}

export function getSystemSettings(): Promise<SystemSettings> {
  return request<SystemSettingsResponse>(
    '/settings/system',
    {},
    'Unable to load system settings.',
  ).then((response) => response.settings)
}

export function updateSystemSettings(
  updates: Partial<
    Record<SystemSettingKey, number>
  >,
): Promise<SystemSettings> {
  return request<SystemSettingsResponse>(
    '/settings/system',
    {
      method: 'PUT',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        settings: updates,
      }),
    },
    'Unable to save system settings.',
  ).then((response) => response.settings)
}
