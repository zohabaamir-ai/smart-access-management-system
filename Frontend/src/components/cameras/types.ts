/* =============================================================
   CAMERAS TYPES

   Camera / CameraStatus live with their service
   (services/cameraService.ts) and are re-exported here so
   component imports stay local to the domain. UI-only types
   stay here.
============================================================= */

export type {
  Camera,
  CameraStatus,
} from '../../services/cameraService'

export type CameraStatusFilter =
  | 'all'
  | 'online'
  | 'offline'
  | 'disabled'

export type CameraView = 'grid' | 'list'
