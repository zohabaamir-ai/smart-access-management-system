import { request } from './api'

/* =============================================================
   CAMERA SERVICE

   Every backend call for the Camera management domain. Types
   mirror the finalized backend Camera contract
   (app/schemas/camera_schemas.py :: CameraResponse) exactly.
   Returns parsed, typed data and throws ApiError on non-2xx.
   components/cameras/types.ts re-exports these.

   Backend routes (app/api/routes/camera_routes.py):
     GET    /cameras              -> CameraResponse[]   VIEW_CAMERAS
     GET    /cameras/{id}         -> CameraResponse     VIEW_CAMERAS
     POST   /cameras              -> CameraResponse     MANAGE_CAMERAS
     PATCH  /cameras/{id}         -> CameraResponse     MANAGE_CAMERAS
     DELETE /cameras/{id}         -> { message }        MANAGE_CAMERAS

   GET /cameras/slug/{slug} is the PUBLIC recognition endpoint
   and is intentionally NOT part of this management service
   (it belongs to the dedicated recognition flow, F7).
============================================================= */

// V1 user-facing status, derived by the backend:
//   disabled - is_active=false (authoritative)
//   online   - a fresh public recognition-session heartbeat
//              (cameras.last_seen_at within the backend TTL)
//   offline  - enabled, no fresh public recognition session
export type CameraStatus =
  | 'online'
  | 'offline'
  | 'disabled'

export interface Camera {
  id: number
  name: string
  slug: string
  location: string
  is_active: boolean
  status: CameraStatus
  // Auto (true) vs Manual (false) recognition mode for this camera's
  // public station. Camera-level, shared across devices (not local).
  auto_recognition: boolean
  created_at: string
}

export interface CreateCameraRequest {
  name: string
  location: string
}

export interface UpdateCameraRequest {
  name?: string
  location?: string
  is_active?: boolean
  auto_recognition?: boolean
}

export function getCameras(): Promise<Camera[]> {
  return request<Camera[]>(
    '/cameras',
    {},
    'Unable to load cameras.',
  )
}

export function getCameraById(
  cameraId: number,
): Promise<Camera> {
  return request<Camera>(
    `/cameras/${cameraId}`,
    {},
    'Unable to load camera.',
  )
}

export function createCamera(
  payload: CreateCameraRequest,
): Promise<Camera> {
  return request<Camera>(
    '/cameras',
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify(payload),
    },
    'Unable to create camera.',
  )
}

export function updateCamera(
  cameraId: number,
  payload: UpdateCameraRequest,
): Promise<Camera> {
  return request<Camera>(
    `/cameras/${cameraId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify(payload),
    },
    'Unable to update camera.',
  )
}

export function decommissionCamera(
  cameraId: number,
): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/cameras/${cameraId}`,
    {
      method: 'DELETE',
    },
    'Unable to decommission camera.',
  )
}
