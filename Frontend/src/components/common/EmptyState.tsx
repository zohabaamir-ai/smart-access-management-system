import type {
  ComponentType,
  ReactNode,
} from 'react'

/* =============================================================
   EMPTY STATE

   The "nothing here yet" panel. Icon + heading + one line of
   guidance + optional action. Content is always domain-specific
   — no generic "No data".

   <EmptyState
     icon={Cctv}
     title="No cameras yet"
     description="Add a camera to start recognizing people at that location."
     action={<Button onClick={openAdd}>Add camera</Button>}
   />
============================================================= */

type EmptyStateProps = {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description?: string
  action?: ReactNode
  /** compact variant for use inside a smaller panel */
  compact?: boolean
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'px-6 py-10' : 'px-6 py-16'
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Icon size={22} />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </p>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export default EmptyState
