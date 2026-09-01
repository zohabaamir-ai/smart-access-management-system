import {
  useMemo,
  useState,
} from 'react'

import useCameras from '../../context/cameras/useCameras'

import {
  getCameraSessionStatus,
} from './cameraStatus'
import type { CameraStatusFilter } from './types'

/* =============================================================
   useCameraList

   Client-side search (name / location / slug) and status
   filtering over the shared CamerasContext list. The views
   window the result with usePagedList (12 grid / 25 list). The
   fetch lifecycle lives in CamerasProvider so the header status
   chip and the Cameras page stay in sync.
============================================================= */

export function useCameraList() {
  const {
    cameras,
    isLoading,
    error,
    reload,
    setCameras,
    activeSessionSlugs,
  } = useCameras()

  const [searchQuery, setSearchQuery] =
    useState('')

  const [statusFilter, setStatusFilter] =
    useState<CameraStatusFilter>('all')

  const filteredCameras = useMemo(() => {
    const query = searchQuery
      .trim()
      .toLowerCase()

    return cameras.filter((camera) => {
      const matchesQuery =
        !query ||
        camera.name
          .toLowerCase()
          .includes(query) ||
        camera.location
          .toLowerCase()
          .includes(query) ||
        camera.slug
          .toLowerCase()
          .includes(query)

      const status =
        getCameraSessionStatus(
          camera,
          activeSessionSlugs,
        )

      const matchesStatus =
        statusFilter === 'all' ||
        statusFilter === status

      return matchesQuery && matchesStatus
    })
  }, [
    cameras,
    searchQuery,
    statusFilter,
    activeSessionSlugs,
  ])

  return {
    cameras,
    setCameras,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredCameras,
    activeSessionSlugs,
    fetchCameras: reload,
  }
}

export default useCameraList
