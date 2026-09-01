import type { ReactNode } from 'react'

import { X } from 'lucide-react'

import useDismiss from '../../hooks/useDismiss'
import IconButton from './IconButton'

/* =============================================================
   DRAWER

   Right-side panel for inspecting a record without leaving the
   list. Backdrop click + Esc close (via useDismiss). Becomes a
   bottom sheet on small screens.

   <Drawer open={!!selected} title={selected?.name} onClose={close}>
     …body…
     footer slot via <Drawer footer={…}>
   </Drawer>
============================================================= */

type DrawerProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  headerRight?: ReactNode
  footer?: ReactNode
  children: ReactNode
  width?: 'md' | 'lg'
}

function Drawer({
  open,
  onClose,
  title,
  subtitle,
  headerRight,
  footer,
  children,
  width = 'md',
}: DrawerProps) {
  const ref = useDismiss<HTMLDivElement>(
    open,
    onClose,
  )

  if (!open) {
    return null
  }

  const widthClass =
    width === 'lg'
      ? 'sm:max-w-lg'
      : 'sm:max-w-md'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        aria-hidden="true"
      />

      {/* panel — right sheet on ≥sm, bottom sheet below */}
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={`elevation-1 relative flex h-full w-full ${widthClass} flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 max-sm:mt-auto max-sm:h-[88vh] max-sm:w-full max-sm:rounded-t-2xl max-sm:border-l-0 max-sm:border-t`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-900 dark:text-white">
              {title}
            </div>

            {subtitle && (
              <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {headerRight}

            <IconButton
              label="Close"
              onClick={onClose}
            >
              <X size={17} />
            </IconButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer && (
          <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Drawer
