import {
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { Compass } from 'lucide-react'

import Button from '../components/common/Button'

/* =============================================================
   NOT FOUND

   Catch-all for an unknown route inside the authenticated
   shell. Retired routes (/terminals, /reports, …) land here
   too — they are not redirected.
============================================================= */

function NotFound() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Compass size={26} />
        </div>

        <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          This page isn&apos;t here
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {location.pathname}
          </code>{' '}
          doesn&apos;t match anything in the app.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() =>
              navigate('/dashboard', {
                replace: true,
              })
            }
          >
            Go to Dashboard
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Go back
          </Button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
