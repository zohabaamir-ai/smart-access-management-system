import { useContext } from 'react'

import { ToastContext } from './ToastContext'

/* =============================================================
   useToast

   const toast = useToast()
   toast.show({ message: 'Camera enabled' })
   toast.show({ message: 'Could not save', tone: 'fault' })
============================================================= */

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error(
      'useToast must be used inside ToastProvider.',
    )
  }

  return context
}

export default useToast
