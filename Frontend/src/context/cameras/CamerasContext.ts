import {
  createContext,
  type Dispatch,
  type SetStateAction,
} from 'react'

import type { Camera } from '../../services/cameraService'

/* =============================================================
   CAMERAS CONTEXT

   One shared load of GET /cameras for the whole authenticated
   shell (header status chip, Dashboard, Cameras page, camera
   preview), so the list is not fetched several times and stays
   in sync after a mutation.

   `activeSessionSlugs` is the set of cameras whose PUBLIC
   recognition URL currently has a live session (a fresh
   heartbeat in this browser's localStorage — see
   context/cameras/cameraSessions.ts). A camera is ONLINE when
   its slug is in this set. The management camera preview does
   NOT contribute to it.
============================================================= */

export type CamerasContextValue = {
  cameras: Camera[]
  isLoading: boolean
  error: string
  reload: () => Promise<void>
  setCameras: Dispatch<
    SetStateAction<Camera[]>
  >
  activeSessionSlugs: Set<string>
}

export const CamerasContext =
  createContext<CamerasContextValue | undefined>(
    undefined,
  )
