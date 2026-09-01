import {
  useCallback,
  useRef,
  useState,
} from 'react'

import {
  CheckCircle2,
  XCircle,
} from 'lucide-react'

import {
  ToastContext,
  type ToastInput,
} from './ToastContext'

/* =============================================================
   TOAST PROVIDER

   Renders a bottom-right stack. Each toast auto-dismisses after
   4s. Mount once, near the app root, inside the router.
============================================================= */

type ActiveToast = {
  id: number
  message: string
  tone: 'ok' | 'fault'
}

const DISMISS_MS = 4000

function ToastProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [toasts, setToasts] = useState<
    ActiveToast[]
  >([])

  const nextId = useRef(1)

  const show = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++

      setToasts((current) => [
        ...current,
        {
          id,
          message: toast.message,
          tone: toast.tone ?? 'ok',
        },
      ])

      window.setTimeout(() => {
        setToasts((current) =>
          current.filter(
            (item) => item.id !== id,
          ),
        )
      }, DISMISS_MS)
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ show }}>
      {children}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`elevation-1 pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${
              toast.tone === 'fault'
                ? 'border-red-200 bg-white text-red-700 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-300'
                : 'border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'
            }`}
          >
            <span className="mt-px shrink-0">
              {toast.tone === 'fault' ? (
                <XCircle
                  size={16}
                  className="text-red-500"
                />
              ) : (
                <CheckCircle2
                  size={16}
                  className="text-emerald-500"
                />
              )}
            </span>

            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
