import type { ReactNode } from 'react'

import {
  Cctv,
  ScanLine,
  UsersRound,
} from 'lucide-react'

import SystemLogo from '../branding/SystemLogo'

/* =============================================================
   AUTH CARD

   One continuous, theme-aware canvas for the unauthenticated
   screens — never a hard split screen.

     showcase  (Login)          — brand story on the left, the
                                   sign-in card sitting on the
                                   same background to the right
     centred   (Change Password)— logo on top, card in the
                                   middle, same background

   Below `lg` both collapse to the centred form with a compact
   mark on top.
============================================================= */

// Shared control styling so every auth input matches.
// `text-base sm:text-sm` — 16px on phones so iOS Safari does not
// auto-zoom the field on focus; the approved 14px is restored from
// the `sm` breakpoint up (unchanged desktop appearance).
export const AUTH_INPUT_CLASS =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/60'

const HIGHLIGHTS = [
  {
    icon: UsersRound,
    title: 'Persons',
    label: 'Manage identities',
  },
  {
    icon: Cctv,
    title: 'Cameras',
    label: 'Live recognition',
  },
  {
    icon: ScanLine,
    title: 'Activity',
    label: 'Recognition events',
  },
]

function Showcase() {
  return (
    <div className="hidden min-w-0 flex-1 lg:block">
      <SystemLogo variant="full" size="md" />

      <span className="mt-9 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:shadow-none">
        <span className="soft-pulse h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Face recognition access
      </span>

      <h2 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-slate-900 xl:text-6xl dark:text-white">
        Recognize People.
        <br />
        <span className="text-blue-600 dark:text-cyan-400">
          Simplify Access.
        </span>
      </h2>

      <p className="mt-6 max-w-md text-[15px] leading-7 text-slate-500 dark:text-slate-400">
        Manage enrolled people, recognition
        cameras, and every recognition event —
        from one secure console.
      </p>

      <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
        {HIGHLIGHTS.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/3 dark:shadow-none"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Icon size={18} />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {item.label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type AuthCardProps = {
  /** Login shows the brand showcase beside the card */
  showcase?: boolean
  /** tighter padding + rhythm for content-heavy forms */
  compact?: boolean
  title: ReactNode
  subtitle?: ReactNode
  /** rendered between the subtitle and the form (forced notice) */
  notice?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

function AuthCard({
  showcase = false,
  compact = false,
  title,
  subtitle,
  notice,
  children,
  footer,
}: AuthCardProps) {
  const card = (
    <div className="mx-auto w-full max-w-sm shrink-0 lg:mx-0">
      <div className="mb-6 flex justify-center lg:hidden">
        <SystemLogo variant="full" size="sm" />
      </div>

      <div
        className={`rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30 ${
          compact
            ? 'p-6 sm:p-6'
            : 'p-7 sm:p-8'
        }`}
      >
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}

        {notice}

        <div className={compact ? 'mt-5' : 'mt-6'}>
          {children}
        </div>
      </div>

      {footer && (
        <p className="mt-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          {footer}
        </p>
      )}
    </div>
  )

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* one continuous background — soft, theme-aware, clipped
          so it never adds page scroll */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-48 -top-40 h-160 w-160 rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-3xl" />
        <div className="absolute -left-24 -top-16 h-120 w-120 rounded-full border border-slate-200/70 dark:border-white/5" />
        <div className="absolute -bottom-40 -right-28 h-120 w-120 rounded-full bg-cyan-500/5 dark:bg-cyan-500/10 blur-3xl" />
      </div>

      {showcase ? (
        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-12 lg:gap-16 lg:px-10">
          <Showcase />
          {card}
        </div>
      ) : (
        <div className="relative mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-6 py-10">
          <div className="mb-6 hidden justify-center lg:flex">
            <SystemLogo variant="full" size="sm" />
          </div>
          {card}
        </div>
      )}
    </div>
  )
}

export default AuthCard
