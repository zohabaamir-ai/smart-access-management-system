import { useState } from 'react'

import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

import {
  ApiError,
  isAuthExpired,
} from '../../services/api'
import {
  decommissionCamera,
  updateCamera,
} from '../../services/cameraService'
import { hasPermission } from '../../services/permissions'
import useToast from '../../components/common/toast/useToast'

import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Alert from '../../components/common/Alert'
import ConfirmModal from '../../components/common/ConfirmModal'

import CameraToolbar from '../../components/cameras/CameraToolbar'
import CameraGrid from '../../components/cameras/CameraGrid'
import CameraListView from '../../components/cameras/CameraListView'
import CameraDetailDrawer from '../../components/cameras/CameraDetailDrawer'
import CameraFormModal from '../../components/cameras/CameraFormModal'
import useCameraList from '../../components/cameras/useCameraList'
import { publicRecognitionUrl } from '../../components/cameras/cameraFormat'
import { getCameraSessionStatus } from '../../components/cameras/cameraStatus'

import type {
  Camera,
  CameraView,
} from '../../components/cameras/types'

/* =============================================================
   CAMERAS  — input-source management

   A device grid (status-first) with a detail drawer. The
   primary action per camera is Open (the live recognition
   workspace); management actions sit behind the ⋮ menu.
============================================================= */

function CamerasPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const canManage = hasPermission(
    'manage_cameras',
  )

  const {
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
    fetchCameras,
  } = useCameraList()

  const [view, setView] =
    useState<CameraView>('grid')

  const [inspecting, setInspecting] =
    useState<Camera | null>(null)

  const [formMode, setFormMode] = useState<
    'add' | 'edit' | null
  >(null)
  const [selectedCamera, setSelectedCamera] =
    useState<Camera | null>(null)

  const [
    decommissionTarget,
    setDecommissionTarget,
  ] = useState<Camera | null>(null)
  const [
    isDecommissioning,
    setIsDecommissioning,
  ] = useState(false)
  const [
    decommissionError,
    setDecommissionError,
  ] = useState('')

  function readError(
    caught: unknown,
    fallback: string,
  ) {
    return caught instanceof ApiError
      ? caught.detail || fallback
      : 'Unable to connect to the access management server.'
  }

  /* ---------- open / inspect ---------- */

  function handleOpen(camera: Camera) {
    navigate(`/cameras/${camera.id}/live`)
  }

  function handleCopyUrl(camera: Camera) {
    const url = publicRecognitionUrl(
      camera.slug,
    )
    navigator.clipboard
      ?.writeText(url)
      .then(
        () =>
          toast.show({
            message:
              'Public recognition URL copied',
          }),
        () =>
          toast.show({
            message: url,
            tone: 'fault',
          }),
      )
  }

  /* ---------- add / edit ---------- */

  function openAdd() {
    setSelectedCamera(null)
    setFormMode('add')
  }

  function openEdit(camera: Camera) {
    setSelectedCamera(camera)
    setFormMode('edit')
  }

  function closeForm() {
    setFormMode(null)
    setSelectedCamera(null)
  }

  async function handleFormSaved({
    message,
  }: {
    message: string
  }) {
    toast.show({ message })
    await fetchCameras()
    closeForm()
  }

  /* ---------- enable / disable ---------- */

  async function handleToggleActive(
    camera: Camera,
  ) {
    try {
      const updated = await updateCamera(
        camera.id,
        { is_active: !camera.is_active },
      )
      setCameras((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      )
      setInspecting((current) =>
        current?.id === updated.id
          ? updated
          : current,
      )
      toast.show({
        message: updated.is_active
          ? `${updated.name} enabled`
          : `${updated.name} disabled`,
      })
    } catch (caught) {
      if (isAuthExpired(caught)) return
      toast.show({
        message: readError(
          caught,
          'Unable to update camera.',
        ),
        tone: 'fault',
      })
    }
  }

  /* ---------- decommission ---------- */

  function openDecommission(camera: Camera) {
    setDecommissionTarget(camera)
    setDecommissionError('')
  }

  function closeDecommission() {
    if (isDecommissioning) return
    setDecommissionTarget(null)
  }

  async function handleDecommission() {
    if (!decommissionTarget) return
    setIsDecommissioning(true)
    setDecommissionError('')
    try {
      await decommissionCamera(
        decommissionTarget.id,
      )
      const name = decommissionTarget.name
      setCameras((current) =>
        current.filter(
          (item) =>
            item.id !==
            decommissionTarget.id,
        ),
      )
      setInspecting((current) =>
        current?.id ===
        decommissionTarget.id
          ? null
          : current,
      )
      setDecommissionTarget(null)
      toast.show({
        message: `${name} decommissioned`,
      })
    } catch (caught) {
      if (isAuthExpired(caught)) return
      setDecommissionError(
        readError(
          caught,
          'Unable to decommission camera.',
        ),
      )
    } finally {
      setIsDecommissioning(false)
    }
  }

  /* ---------- derived ---------- */

  const onlineCount = cameras.filter(
    (c) =>
      getCameraSessionStatus(
        c,
        activeSessionSlugs,
      ) === 'online',
  ).length
  const disabledCount = cameras.filter(
    (c) => !c.is_active,
  ).length
  const searchActive =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all'

  const gridProps = {
    cameras: filteredCameras,
    isLoading,
    hasAnyCameras: cameras.length > 0,
    searchActive,
    query: searchQuery,
    resetKey: `${searchQuery.trim()}|${statusFilter}`,
    activeSlugs: activeSessionSlugs,
    canManage,
    onAdd: openAdd,
    onOpen: handleOpen,
    onInspect: setInspecting,
    onEdit: openEdit,
    onToggleActive: handleToggleActive,
    onDecommission: openDecommission,
    onCopyUrl: handleCopyUrl,
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cameras"
        description="View, manage and preview a camera, or configure it for the recognition."
        meta={
          cameras.length > 0
            ? `${cameras.length} · ${onlineCount} online${
                disabledCount
                  ? ` · ${disabledCount} disabled`
                  : ''
              }`
            : undefined
        }
        actions={
          canManage && (
            <Button
              icon={<Plus size={16} />}
              onClick={openAdd}
            >
              Add camera
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      <CameraToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={
          setStatusFilter
        }
        view={view}
        onViewChange={setView}
      />

      {view === 'grid' ? (
        <CameraGrid {...gridProps} />
      ) : (
        <CameraListView {...gridProps} />
      )}

      <CameraDetailDrawer
        key={inspecting?.id ?? 'none'}
        camera={inspecting}
        activeSlugs={activeSessionSlugs}
        canManage={canManage}
        onClose={() => setInspecting(null)}
        onOpen={handleOpen}
        onEdit={openEdit}
        onToggleActive={handleToggleActive}
        onDecommission={openDecommission}
        onCopyUrl={handleCopyUrl}
      />

      {formMode && (
        <CameraFormModal
          mode={formMode}
          camera={selectedCamera}
          onClose={closeForm}
          onSaved={handleFormSaved}
        />
      )}

      {decommissionTarget && (
        <ConfirmModal
          title="Decommission camera?"
          description={
            <>
              <span className="font-medium text-slate-900 dark:text-white">
                {decommissionTarget.name}
              </span>{' '}
              will stop accepting
              recognitions and be removed from
              the active list. Its recognition
              history is kept.
            </>
          }
          confirmLabel={
            isDecommissioning
              ? 'Decommissioning…'
              : 'Decommission'
          }
          loading={isDecommissioning}
          error={decommissionError}
          onCancel={closeDecommission}
          onConfirm={handleDecommission}
        />
      )}
    </div>
  )
}

export default CamerasPage
