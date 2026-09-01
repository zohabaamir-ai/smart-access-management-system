import {
  Cctv,
  Copy,
  Eye,
  Pencil,
  Power,
  Trash2,
} from 'lucide-react'

import Card from '../common/Card'
import EmptyState from '../common/EmptyState'
import Skeleton from '../common/Skeleton'
import { StatusDot } from '../common/StatusDot'
import { Menu, MenuItem } from '../common/Menu'
import Highlight from '../common/Highlight'
import ShowMoreBar from '../common/ShowMoreBar'
import usePagedList from '../../hooks/usePagedList'

import { formatDate } from './cameraFormat'
import {
  getCameraSessionStatus,
  getCameraStatusMeta,
} from './cameraStatus'
import type { Camera } from './types'

/* =============================================================
   CAMERA LIST VIEW  (compact alternative to the grid)

   25 rows per page, "Show more" in steps of 25.
============================================================= */

const PAGE = 25

type Props = {
  cameras: Camera[]
  isLoading: boolean
  hasAnyCameras: boolean
  searchActive: boolean
  query: string
  resetKey: string
  activeSlugs: Set<string>
  canManage: boolean
  onOpen: (camera: Camera) => void
  onInspect: (camera: Camera) => void
  onEdit: (camera: Camera) => void
  onToggleActive: (camera: Camera) => void
  onDecommission: (camera: Camera) => void
  onCopyUrl: (camera: Camera) => void
}

function CameraListView({
  cameras,
  isLoading,
  hasAnyCameras,
  searchActive,
  query,
  resetKey,
  activeSlugs,
  canManage,
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
      <Card className="overflow-hidden">
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map(
            (_, i) => (
              <Skeleton
                key={i}
                className="h-14 w-full rounded-lg"
              />
            ),
          )}
        </div>
      </Card>
    )
  }

  if (cameras.length === 0) {
    return (
      <Card className="overflow-hidden">
        <EmptyState
          icon={Cctv}
          title={
            hasAnyCameras && searchActive
              ? 'No cameras match your filters'
              : 'No cameras yet'
          }
          description={
            hasAnyCameras && searchActive
              ? 'Try a different search or status.'
              : 'Add a camera to start recognizing people at that location.'
          }
          compact
        />
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
            <th className="px-4 py-2.5 font-medium">
              Camera
            </th>
            <th className="px-4 py-2.5 font-medium">
              Status
            </th>
            <th className="px-4 py-2.5 font-medium">
              Slug
            </th>
            <th className="px-4 py-2.5 font-medium">
              Added
            </th>
            <th className="px-4 py-2.5 text-right font-medium">
              &nbsp;
            </th>
          </tr>
        </thead>
        <tbody>
          {page.visible.map((camera) => {
            const status =
              getCameraSessionStatus(
                camera,
                activeSlugs,
              )
            const meta =
              getCameraStatusMeta(status)
            const disabled =
              status === 'disabled'

            return (
              <tr
                key={camera.id}
                onClick={() =>
                  onInspect(camera)
                }
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900 dark:text-white">
                    <Highlight
                      text={camera.name}
                      query={query}
                    />
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <Highlight
                      text={camera.location}
                      query={query}
                    />
                  </p>
                </td>
                <td className="px-4 py-3">
                  <StatusDot
                    tone={meta.tone}
                    label={meta.label}
                  />
                </td>
                <td className="px-4 py-3">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Highlight
                      text={camera.slug}
                      query={query}
                    />
                  </code>
                </td>
                <td className="tnum px-4 py-3 text-slate-500 dark:text-slate-400">
                  {formatDate(
                    camera.created_at,
                  )}
                </td>
                <td className="px-4 py-3">
                  <div
                    className="flex items-center justify-end gap-1"
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                  >
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpen(camera)
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-2.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <Eye size={13} />
                        Preview
                      </button>
                    )}
                    <Menu
                      label={`${camera.name} actions`}
                    >
                      <MenuItem
                        icon={
                          <Copy size={15} />
                        }
                        onClick={() =>
                          onCopyUrl(camera)
                        }
                      >
                        Copy public recognition URL
                      </MenuItem>
                      {canManage && (
                        <>
                          <MenuItem
                            icon={
                              <Pencil
                                size={15}
                              />
                            }
                            onClick={() =>
                              onEdit(camera)
                            }
                          >
                            Edit
                          </MenuItem>
                          <MenuItem
                            icon={
                              <Power
                                size={15}
                              />
                            }
                            onClick={() =>
                              onToggleActive(
                                camera,
                              )
                            }
                          >
                            {camera.is_active
                              ? 'Disable'
                              : 'Enable'}
                          </MenuItem>
                          <MenuItem
                            tone="danger"
                            icon={
                              <Trash2
                                size={15}
                              />
                            }
                            onClick={() =>
                              onDecommission(
                                camera,
                              )
                            }
                          >
                            Decommission
                          </MenuItem>
                        </>
                      )}
                    </Menu>
                  </div>
                </td>
              </tr>
            )
          })}
          </tbody>
        </table>
      </div>

      {(page.canShowMore ||
        page.canShowLess) && (
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <ShowMoreBar
            shown={page.shown}
            total={page.total}
            canShowMore={page.canShowMore}
            canShowLess={page.canShowLess}
            onShowMore={page.showMore}
            onShowLess={page.showLess}
            noun="camera"
          />
        </div>
      )}
    </Card>
  )
}

export default CameraListView
