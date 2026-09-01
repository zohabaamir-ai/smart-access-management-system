import type { StatusTone } from '../common/StatusDot'
import type { Camera } from './types'

/* =============================================================
   CAMERA STATUS

   Three V1 states:

     DISABLED  administratively disabled (is_active = false).
               Backend-owned, authoritative, persistent.

     ONLINE    the camera's PUBLIC recognition station
               (/recognition/camera/:slug) has a fresh session
               heartbeat. The BACKEND is authoritative (works
               across devices/browsers — camera.status === 'online'
               when cameras.last_seen_at is within the TTL); a
               same-browser localStorage heartbeat is kept only as
               an immediate fallback. Opening the management camera
               preview (/cameras/:id/live) does NOT make a camera
               ONLINE.

     OFFLINE   enabled, but no fresh public recognition session.
============================================================= */

export type CameraSessionStatus =
  | 'online'
  | 'offline'
  | 'disabled'

export function getCameraSessionStatus(
  camera: Pick<
    Camera,
    'is_active' | 'slug' | 'status'
  >,
  activeSessionSlugs: Set<string>,
): CameraSessionStatus {
  if (!camera.is_active) {
    return 'disabled'
  }
  // Backend session presence is authoritative and cross-device.
  if (camera.status === 'online') {
    return 'online'
  }
  // Same-browser fallback for zero-latency feedback while the
  // backend poll catches up.
  if (activeSessionSlugs.has(camera.slug)) {
    return 'online'
  }
  return 'offline'
}

type StatusMeta = {
  label: string
  tone: StatusTone
  hint: string
}

const META: Record<
  CameraSessionStatus,
  StatusMeta
> = {
  online: {
    label: 'Online',
    tone: 'ok',
    hint: 'The public recognition URL has a live session.',
  },
  offline: {
    label: 'Offline',
    tone: 'idle',
    hint: 'Enabled — no active public recognition session.',
  },
  disabled: {
    label: 'Disabled',
    tone: 'attention',
    hint: 'Administratively disabled. It will not accept recognitions.',
  },
}

export function getCameraStatusMeta(
  status: CameraSessionStatus,
): StatusMeta {
  return META[status]
}
