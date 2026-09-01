import {
  ChevronRight,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import Card from '../common/Card'

/* =============================================================
   SECURITY SETTINGS

   Account security for the signed-in user. V1 has one action:
   change your password. Access to protected features is
   governed by the account role.
============================================================= */

function SecuritySettings() {
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <Card
        title="Account security"
        description="Keep your sign-in credentials up to date."
        bodyClassName="p-0"
      >
        <button
          type="button"
          onClick={() =>
            navigate('/change-password')
          }
          className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <span className="flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <LockKeyhole size={17} />
            </span>
            <span>
              <span className="block text-sm font-medium text-slate-900 dark:text-white">
                Change password
              </span>
              <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
                Update your account password.
              </span>
            </span>
          </span>
          <ChevronRight
            size={18}
            className="text-slate-500"
          />
        </button>
      </Card>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
        <ShieldCheck
          size={16}
          className="mt-0.5 shrink-0 text-slate-500"
        />
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          Access to protected features is
          controlled by your account role. Your
          administrator manages roles and
          account status.
        </p>
      </div>
    </div>
  )
}

export default SecuritySettings
