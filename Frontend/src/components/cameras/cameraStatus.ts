import type { StatusTone } from '../common/StatusDot'
import type { Camera } from './types'

/* =============================================================
   CAMERA STATUS

   Three V1 states:

     DISABLED  administratively disabled (is_active = false).
               Backend-owned, authoritative, persistent.

     ONLINE    the camera's PUBLIC recognition URL
               (/recognition/camera/:slug) currently has a live
               recognition session — a fresh heartbeat in this
               browser's localStorage. Opening the management
               camera preview (/cameras/:id/live) does NOT make
               a camera ONLINE.

     OFFLINE   enabled, but no active public recognition session.

   This is a per-browser signal (see cameraSessions.ts). True
   cross-device presence needs backend support — documented as
   BACKEND RECOMMENDATION — CAMERA RECOGNITION SESSION PRESENCE.
============================================================= */

export type CameraSessionStatus =
  | 'online'
  | 'offline'
  | 'disabled'

export function getCameraSessionStatus(
  camera: Pick<Camera, 'is_active' | 'slug'>,
  activeSessionSlugs: Set<string>,
): CameraSessionStatus {
  if (!camera.is_active) {
    return 'disabled'
  }
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
