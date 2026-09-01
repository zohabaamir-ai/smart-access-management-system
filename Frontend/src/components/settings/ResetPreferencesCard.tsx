import { useState } from 'react'

import { RotateCcw } from 'lucide-react'

import Button from '../common/Button'
import ConfirmModal from '../common/ConfirmModal'

/* =============================================================
   RESET PREFERENCES CARD

   Restores the locally-stored app preferences to their
   defaults. Guarded by the shared ConfirmModal.
============================================================= */

type ResetPreferencesCardProps = {
  onReset: () => void
}

function ResetPreferencesCard({
  onReset,
}: ResetPreferencesCardProps) {
  const [showConfirm, setShowConfirm] =
    useState(false)

  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-800/40">
      <div className="flex items-start gap-3">
        <RotateCcw
          size={16}
          className="mt-0.5 shrink-0 text-slate-500"
        />
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Reset preferences
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Restore theme, density and the other
            local preferences to their defaults.
          </p>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowConfirm(true)}
      >
        Reset preferences
      </Button>

      {showConfirm && (
        <ConfirmModal
          title="Reset preferences?"
          description="This restores every local application preference to its default. It does not affect your account."
          confirmLabel="Reset preferences"
          icon={RotateCcw}
          loading={false}
          onCancel={() =>
            setShowConfirm(false)
          }
          onConfirm={() => {
            setShowConfirm(false)
            onReset()
          }}
        />
      )}
    </div>
  )
}

export default ResetPreferencesCard
