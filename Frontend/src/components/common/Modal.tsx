import type { ReactNode } from 'react'

/* =============================================================
   MODAL

   Shared overlay + panel shell for dialogs. Reproduces the
   markup the app already uses (person / camera / user modals)
   so adopting it is a structural move, not a restyle.

   - size          panel max-width
   - onClose +
     closeOnBackdrop  click the dimmed backdrop to dismiss
   - panelClassName   extra classes on the white panel
                      (e.g. "max-h-[92vh] overflow-y-auto")
   - overlayClassName extra classes on the backdrop
                      (e.g. "z-60", a different tint)
============================================================= */

type ModalSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<
  ModalSize,
  string
> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

type ModalProps = {
  children: ReactNode
  size?: ModalSize
  onClose?: () => void
  closeOnBackdrop?: boolean
  panelClassName?: string
  overlayClassName?: string
  /** false lets the panel scroll its own overflow (tall forms) */
  clipOverflow?: boolean
}

function Modal({
  children,
  size = 'md',
  onClose,
  closeOnBackdrop = false,
  panelClassName = '',
  overlayClassName = '',
  clipOverflow = true,
}: ModalProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm ${overlayClassName}`}
      onMouseDown={
        closeOnBackdrop && onClose
          ? (event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                onClose()
              }
            }
          : undefined
      }
    >
      <div
        className={`w-full ${SIZE_CLASS[size]} ${
          clipOverflow
            ? 'overflow-hidden'
            : ''
        } rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  )
}

export default Modal
