import {
  useEffect,
  useRef,
} from 'react'

/* =============================================================
   useDismiss

   One implementation of "close when the user clicks outside
   or presses Escape". Replaces the copy-pasted outside-click
   effects across the header / profile menu / dropdowns.

   const ref = useDismiss<HTMLDivElement>(open, close)
   <div ref={ref}> ...dropdown... </div>

   - `active`    when false the listeners are not attached
   - `onDismiss` called on an outside mousedown or Escape key
   - `closeOnEscape` set false to ignore the Escape key
============================================================= */

export function useDismiss<
  T extends HTMLElement = HTMLElement,
>(
  active: boolean,
  onDismiss: () => void,
  options?: {
    closeOnEscape?: boolean
  },
) {
  const ref = useRef<T>(null)

  const closeOnEscape =
    options?.closeOnEscape ?? true

  // Keep the latest callback without re-binding listeners.
  const handlerRef =
    useRef(onDismiss)

  useEffect(() => {
    handlerRef.current = onDismiss
  })

  useEffect(() => {
    if (!active) {
      return
    }

    function handlePointer(
      event: MouseEvent,
    ) {
      const node = ref.current

      if (
        node &&
        !node.contains(
          event.target as Node,
        )
      ) {
        handlerRef.current()
      }
    }

    function handleKey(
      event: KeyboardEvent,
    ) {
      if (
        closeOnEscape &&
        event.key === 'Escape'
      ) {
        handlerRef.current()
      }
    }

    document.addEventListener(
      'mousedown',
      handlePointer,
    )

    document.addEventListener(
      'keydown',
      handleKey,
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointer,
      )

      document.removeEventListener(
        'keydown',
        handleKey,
      )
    }
  }, [active, closeOnEscape])

  return ref
}

export default useDismiss
