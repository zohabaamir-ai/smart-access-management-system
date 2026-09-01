import {
  Copy,
  Eye,
  MapPin,
  Pencil,
  Power,
  Trash2,
} from 'lucide-react'

import { StatusDot } from '../common/StatusDot'
import { Menu, MenuItem } from '../common/Menu'
import Highlight from '../common/Highlight'

import {
  getCameraSessionStatus,
  getCameraStatusMeta,
} from './cameraStatus'
import type { Camera } from './types'

/* =============================================================
   CAMERA TILE

   A camera as an operational input device: status first,
   identity clear, primary action = Open. Disabled cameras are
   de-emphasised.
============================================================= */

type Props = {
  camera: Camera
  query?: string
  activeSlugs: Set<string>
  canManage: boolean
  onOpen: (camera: Camera) => void
  onInspect: (camera: Camera) => void
  onEdit: (camera: Camera) => void
  onToggleActive: (camera: Camera) => void
  onDecommission: (camera: Camera) => void
  onCopyUrl: (camera: Camera) => void
}

function CameraTile({
  camera,
  query = '',
  activeSlugs,
  canManage,
  onOpen,
  onInspect,
  onEdit,
  onToggleActive,
  onDecommission,
  onCopyUrl,
}: Props) {
  const status = getCameraSessionStatus(
    camera,
    activeSlugs,
  )
  const meta = getCameraStatusMeta(status)
  const disabled = status === 'disabled'

  return (
    <div
      className={`group flex flex-col rounded-xl border transition-colors ${
        disabled
          ? 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
      }`}
    >
      <button
        type="button"
        onClick={() => onInspect(camera)}
        className="flex-1 rounded-t-xl px-4 pt-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
      >
        <div className="flex items-center justify-between gap-2">
          <StatusDot
            tone={meta.tone}
            label={meta.label}
            pulse={status === 'online'}
          />
        </div>

        <p
          className={`mt-2.5 truncate text-[15px] font-semibold ${
            disabled
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-slate-900 dark:text-white'
          }`}
        >
          <Highlight
            text={camera.name}
            query={query}
          />
        </p>

        <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500 dark:text-slate-400">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">
            <Highlight
              text={camera.location}
              query={query}
            />
          </span>
        </p>

        <code className="mt-2 inline-block max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Highlight
            text={camera.slug}
            query={query}
          />
        </code>
      </button>

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800/70">
        {disabled ? (
          canManage ? (
            <button
              type="button"
              onClick={() =>
                onToggleActive(camera)
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Power size={14} />
              Enable
            </button>
          ) : (
            <span className="text-xs text-slate-500">
              Disabled
            </span>
          )
        ) : (
          <button
            type="button"
            onClick={() => onOpen(camera)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Eye size={14} />
            Preview
          </button>
        )}

        <div className="ml-auto">
          <Menu label={`${camera.name} actions`}>
            <MenuItem
              icon={<Eye size={15} />}
              onClick={() =>
                onInspect(camera)
              }
            >
              Details
            </MenuItem>
            <MenuItem
              icon={<Copy size={15} />}
              onClick={() =>
                onCopyUrl(camera)
              }
            >
              Copy public recognition URL
            </MenuItem>
            {canManage && (
              <>
                <MenuItem
                  icon={<Pencil size={15} />}
                  onClick={() =>
                    onEdit(camera)
                  }
                >
                  Edit
                </MenuItem>
                <MenuItem
                  icon={<Power size={15} />}
                  onClick={() =>
                    onToggleActive(camera)
                  }
                >
                  {camera.is_active
                    ? 'Disable'
                    : 'Enable'}
                </MenuItem>
                <MenuItem
                  tone="danger"
                  icon={<Trash2 size={15} />}
                  onClick={() =>
                    onDecommission(camera)
                  }
                >
                  Decommission
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      </div>
    </div>
  )
}

export default CameraTile
