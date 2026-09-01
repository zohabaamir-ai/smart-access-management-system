import { Cctv } from 'lucide-react'

import EmptyState from '../common/EmptyState'
import Skeleton from '../common/Skeleton'
import ShowMoreBar from '../common/ShowMoreBar'
import usePagedList from '../../hooks/usePagedList'

import CameraTile from './CameraTile'
import type { Camera } from './types'

/* =============================================================
   CAMERA GRID  (default Cameras view)

   12 tiles per page, "Show more" in steps of 12.
============================================================= */

const PAGE = 12

type Props = {
  cameras: Camera[]
  isLoading: boolean
  hasAnyCameras: boolean
  searchActive: boolean
  query: string
  resetKey: string
  activeSlugs: Set<string>
  canManage: boolean
  onAdd: () => void
  onOpen: (camera: Camera) => void
  onInspect: (camera: Camera) => void
  onEdit: (camera: Camera) => void
  onToggleActive: (camera: Camera) => void
  onDecommission: (camera: Camera) => void
  onCopyUrl: (camera: Camera) => void
}

function CameraGrid({
  cameras,
  isLoading,
  hasAnyCameras,
  searchActive,
  query,
  resetKey,
  activeSlugs,
  canManage,
  onAdd,
  onOpen,
  onInspect,
  onEdit,
  onToggleActive,
  onDecommission,
  onCopyUrl,
}: Props) {
  const page = usePagedList(
    cameras,
    PAGE,
    resetKey,
  )

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map(
          (_, i) => (
            <Skeleton
              key={i}
              className="h-44 rounded-xl"
            />
          ),
        )}
      </div>
    )
  }

  if (cameras.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {hasAnyCameras && searchActive ? (
          <EmptyState
            icon={Cctv}
            title="No cameras match your filters"
            description="Try a different search or status."
          />
        ) : (
          <EmptyState
            icon={Cctv}
            title="No cameras yet"
            description="Add a camera to start recognizing people at that location."
            action={
              canManage ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add camera
                </button>
              ) : undefined
            }
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {page.visible.map((camera) => (
          <CameraTile
            key={camera.id}
            camera={camera}
            query={query}
            activeSlugs={activeSlugs}
            canManage={canManage}
            onOpen={onOpen}
            onInspect={onInspect}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
            onDecommission={onDecommission}
            onCopyUrl={onCopyUrl}
          />
        ))}
      </div>

      {(page.canShowMore ||
        page.canShowLess) && (
        <ShowMoreBar
          shown={page.shown}
          total={page.total}
          canShowMore={page.canShowMore}
          canShowLess={page.canShowLess}
          onShowMore={page.showMore}
          onShowLess={page.showLess}
          noun="camera"
        />
      )}
    </div>
  )
}

export default CameraGrid
