import { createContext } from 'react'

/* =============================================================
   TOAST — context object

   Transient feedback for a completed action ("Camera enabled").
   NOT a notification centre: no history, no persistence, no
   bell. Errors that need attention stay as inline <Alert>.
============================================================= */

export type ToastTone = 'ok' | 'fault'

export type ToastInput = {
  message: string
  tone?: ToastTone
}

export type ToastContextValue = {
  show: (toast: ToastInput) => void
}

export const ToastContext =
  createContext<ToastContextValue | undefined>(
    undefined,
  )
