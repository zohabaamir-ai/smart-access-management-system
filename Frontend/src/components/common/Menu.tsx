import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { MoreVertical } from 'lucide-react'

/* =============================================================
   MENU

   A minimal action menu: a trigger (default: a "⋮" icon
   button) and a panel of <MenuItem>s. The panel renders in a
   portal with fixed positioning so it is never clipped by an
   `overflow` ancestor (e.g. a scrollable table). Closes on
   outside click, Esc, or page scroll.

   <Menu label="Camera actions">
     <MenuItem icon={<Pencil size={15}/>} onClick={edit}>Edit</MenuItem>
     <MenuItem tone="danger" onClick={remove}>Decommission</MenuItem>
   </Menu>
============================================================= */

type MenuProps = {
  label: string
  children: ReactNode
  align?: 'end' | 'start'
  trigger?: (props: {
    open: boolean
    toggle: () => void
  }) => ReactNode
}

const PANEL_MIN_W = 200
const GAP = 4

export function Menu({
  label,
  children,
  align = 'end',
  trigger,
}: MenuProps) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] =
    useState<CSSProperties>({})

  const anchorRef =
    useRef<HTMLDivElement>(null)
  const panelRef =
    useRef<HTMLDivElement>(null)

  const toggle = () =>
    setOpen((value) => !value)

  useLayoutEffect(() => {
    if (!open) return

    const place = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const openUp =
        r.bottom + 260 > vh && r.top > 260

      const next: CSSProperties = {
        position: 'fixed',
        minWidth: PANEL_MIN_W,
        zIndex: 60,
      }
      if (align === 'end') {
        next.right = Math.max(
          8,
          window.innerWidth - r.right,
        )
      } else {
        next.left = Math.max(8, r.left)
      }
      if (openUp) {
        next.bottom = vh - r.top + GAP
      } else {
        next.top = r.bottom + GAP
      }
      setStyle(next)
    }

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchorRef.current?.contains(t))
        return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScroll = () => setOpen(false)

    place()
    document.addEventListener(
      'mousedown',
      onDown,
    )
    document.addEventListener('keydown', onKey)
    window.addEventListener(
      'scroll',
      onScroll,
      true,
    )
    window.addEventListener('resize', place)

    return () => {
      document.removeEventListener(
        'mousedown',
        onDown,
      )
      document.removeEventListener(
        'keydown',
        onKey,
      )
      window.removeEventListener(
        'scroll',
        onScroll,
        true,
      )
      window.removeEventListener(
        'resize',
        place,
      )
    }
  }, [open, align])

  return (
    <div
      className="inline-flex"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <div
        ref={anchorRef}
        className="inline-flex"
      >
        {trigger ? (
          trigger({ open, toggle })
        ) : (
          <button
            type="button"
            aria-label={label}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={toggle}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <MoreVertical size={16} />
          </button>
        )}
      </div>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={style}
            onClick={() => setOpen(false)}
            className="elevation-1 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 dark:border-slate-800 dark:bg-slate-900"
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  )
}

type MenuItemProps = {
  children: ReactNode
  onClick?: () => void
  icon?: ReactNode
  tone?: 'default' | 'danger'
  disabled?: boolean
}

export function MenuItem({
  children,
  onClick,
  icon,
  tone = 'default',
  disabled = false,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === 'danger'
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      {icon && (
        <span className="shrink-0 text-slate-500 dark:text-slate-500">
          {icon}
        </span>
      )}
      {children}
    </button>
  )
}

export default Menu
