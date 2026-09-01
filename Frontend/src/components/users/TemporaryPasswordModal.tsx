import {
  useState,
} from 'react'

import {
  Check,
  Copy,
  KeyRound,
} from 'lucide-react'

import Modal from '../common/Modal'
import Button from '../common/Button'

/* =============================================================
   TEMPORARY PASSWORD MODAL

   The backend returns a one-time temporary password on user
   creation and on an administrative password reset. It cannot
   be retrieved again, so it is shown here once with a copy
   affordance and a clear hand-off instruction.
============================================================= */

type TemporaryPasswordModalProps = {
  title: string
  username: string
  temporaryPassword: string
  onClose: () => void
}

function TemporaryPasswordModal({
  title,
  username,
  temporaryPassword,
  onClose,
}: TemporaryPasswordModalProps) {
  const [copied, setCopied] =
    useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        temporaryPassword,
      )

      setCopied(true)

      window.setTimeout(
        () => setCopied(false),
        2000,
      )
    } catch {
      // Clipboard unavailable — the value is still visible for
      // the user to copy manually.
    }
  }

  return (
    <Modal size="md">
      <div className="p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
          <KeyRound size={18} />
        </div>

        <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Share this temporary password with{' '}
          <span className="font-medium text-slate-900 dark:text-white">
            {username}
          </span>
          . They will be required to set a new
          password on first sign-in. It is shown
          only once.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
          <code className="flex-1 truncate font-mono text-sm text-slate-900 dark:text-white">
            {temporaryPassword}
          </code>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {copied ? (
              <>
                <Check size={14} />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}

export default TemporaryPasswordModal
