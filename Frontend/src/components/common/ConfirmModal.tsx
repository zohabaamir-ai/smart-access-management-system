import {
  RefreshCw,
  Trash2,
} from 'lucide-react'

import type {
  ComponentType,
  ReactNode,
} from 'react'

import Modal from './Modal'
import Alert from './Alert'

/* =============================================================
   CONFIRM MODAL

   Shared destructive-confirmation dialog. Use this instead of
   window.confirm() or a hand-rolled dialog.

   - description accepts rich content (bold names, etc.)
   - error     optional inline error shown above the buttons
============================================================= */

type ConfirmModalProps = {
  title: string
  description: ReactNode
  confirmLabel: string
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
  icon?: ComponentType<{ size?: number }>
  error?: string
  /** e.g. "z-60" to stack above another modal */
  overlayClassName?: string
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
  icon: Icon = Trash2,
  error,
  overlayClassName,
}: ConfirmModalProps) {
  return (
    <Modal
      size="md"
      overlayClassName={overlayClassName}
    >
      <div className="p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
          <Icon size={18} />
        </div>

        <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>

        <div className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </div>

        {error && (
          <Alert
            variant="error"
            className="mt-4"
          >
            {error}
          </Alert>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && (
            <RefreshCw
              size={14}
              className="animate-spin"
            />
          )}

          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
