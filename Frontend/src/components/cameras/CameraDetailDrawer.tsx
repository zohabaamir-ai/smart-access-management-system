import {
  useState,
  type ReactNode,
} from 'react'

import {
  Copy,
  ExternalLink,
  Eye,
  Pencil,
  Power,
  ScanLine,
  Trash2,
} from 'lucide-react'

import Drawer from '../common/Drawer'
import Button from '../common/Button'
import Toggle from '../common/Toggle'
import { StatusDot } from '../common/StatusDot'
import { Menu, MenuItem } from '../common/Menu'

import useCameraActivity from './useCameraActivity'
import { formatRelativeTime } from '../../utils/time'
import {
  getAutoRecognition,
  setAutoRecognition,
} from '../../context/cameras/cameraSessions'

import {
  formatDate,
  publicRecognitionUrl,
} from './cameraFormat'
import {
  getCameraSessionStatus,
  getCameraStatusMeta,
} from './cameraStatus'
import type { Camera } from './types'

/* =============================================================
   CAMERA DETAIL DRAWER

   Inspect and configure one camera. "Preview" opens the
   management camera view (video only, no recognition). Auto
   Recognition is the per-camera setting the PUBLIC recognition
   URL consumes.
============================================================= */

type Props = {
  camera: Camera | null
  activeSlugs: Set<string>
  canManage: boolean
  onClose: () => void
  onOpen: (camera: Camera) => void
  onEdit: (camera: Camera) => void
  onToggleActive: (camera: Camera) => void
  onDecommission: (camera: Camera) => void
  onCopyUrl: (camera: Camera) => void
}

function CameraDetailDrawer({
  camera,
  activeSlugs,
  canManage,
  onClose,
  onOpen,
  onEdit,
  onToggleActive,
  onDecommission,
  onCopyUrl,
}: Props) {
  const { events, loaded } =
    useCameraActivity(camera?.id ?? 0)

  const [auto, setAuto] = useState<boolean>(
    () =>
      camera
        ? getAutoRecognition(camera.slug)
        : false,
  )

  if (!camera) {
    return null
  }

  const status = getCameraSessionStatus(
    camera,
    activeSlugs,
  )
  const meta = getCameraStatusMeta(status)
  const disabled = status === 'disabled'

  function handleAutoChange(next: boolean) {
    if (!camera) return
    setAuto(next)
    setAutoRecognition(camera.slug, next)
  }

  return (
    <Drawer
      open={!!camera}
      onClose={onClose}
      title={camera.name}
      subtitle={camera.location}
      headerRight={
        <StatusDot
          tone={meta.tone}
          label={meta.label}
          pulse={status === 'online'}
        />
      }
      footer={
        <div className="flex items-center gap-2">
          {disabled ? (
            canManage && (
              <Button
                icon={<Power size={15} />}
                onClick={() =>
                  onToggleActive(camera)
                }
              >
                Enable camera
              </Button>
            )
          ) : (
            <Button
              icon={<Eye size={15} />}
              onClick={() => onOpen(camera)}
            >
              Preview camera
            </Button>
          )}

          {canManage && (
            <Menu
              label="More actions"
              align="start"
              trigger={({ toggle }) => (
                <Button
                  variant="secondary"
                  onClick={toggle}
                >
                  More
                </Button>
              )}
            >
              <MenuItem
                icon={<Pencil size={15} />}
                onClick={() => onEdit(camera)}
              >
                Edit
              </MenuItem>
              {!disabled && (
                <MenuItem
                  icon={<Power size={15} />}
                  onClick={() =>
                    onToggleActive(camera)
                  }
                >
                  Disable
                </MenuItem>
              )}
              <MenuItem
                tone="danger"
                icon={<Trash2 size={15} />}
                onClick={() =>
                  onDecommission(camera)
                }
              >
                Decommission
              </MenuItem>
            </Menu>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <Heading>Details</Heading>
          <dl className="mt-3 space-y-3">
            <Row label="Status">
              {disabled
                ? 'Disabled'
                : status === 'online'
                  ? 'Online'
                  : 'Enabled'}
            </Row>
            <Row label="Location">
              {camera.location}
            </Row>
            <Row label="Slug">
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {camera.slug}
              </code>
              <button
                type="button"
                onClick={() =>
                  onCopyUrl(camera)
                }
                className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                <Copy size={12} /> Copy URL
              </button>
            </Row>
            <Row label="Public recognition URL">
              <a
                href={publicRecognitionUrl(
                  camera.slug,
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                {publicRecognitionUrl(
                  camera.slug,
                )}
                <ExternalLink size={12} />
              </a>
            </Row>
            <Row label="Added">
              <span className="tnum">
                {formatDate(
                  camera.created_at,
                )}
              </span>
            </Row>
          </dl>
        </div>

        <div>
          <Heading>Recognition</Heading>
          <div className="mt-2.5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <label className="flex items-start justify-between gap-4">
              <span>
                <span className="block text-sm font-medium text-slate-900 dark:text-white">
                  Auto recognition
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                  When on, the public camera URL
                  scans continuously (~2.5s).
                  When off, it waits for a
                  manual Recognise.
                </span>
              </span>
              <Toggle
                checked={auto}
                onChange={handleAutoChange}
                aria-label="Auto recognition for this camera"
              />
            </label>
            <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
              Saved on this device. The public
              camera page reads it when it
              opens.
            </p>
          </div>
        </div>

        <div>
          <Heading>Recent at this camera</Heading>
          <div className="mt-2.5">
            {!loaded ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-800">
                Loading…
              </p>
            ) : events.length === 0 ? (
              <p className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
                <ScanLine size={14} />
                No recognitions here yet
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <span className="truncate text-sm text-slate-700 dark:text-slate-200">
                      {event.person_name}
                    </span>
                    <span className="tnum shrink-0 text-xs text-slate-500 dark:text-slate-500">
                      {formatRelativeTime(
                        event.timestamp,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  )
}

function Heading({
  children,
}: {
  children: ReactNode
}) {
  return (
    <h3 className="text-[15px] font-medium text-slate-900 dark:text-white">
      {children}
    </h3>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </dt>
      <dd className="text-[15px] leading-6 text-slate-700 dark:text-slate-200">
        {children}
      </dd>
    </div>
  )
}

export default CameraDetailDrawer
