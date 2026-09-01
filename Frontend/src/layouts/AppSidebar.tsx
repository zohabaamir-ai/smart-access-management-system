import {
  Cctv,
  History,
  LayoutDashboard,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react'

import { NavLink } from 'react-router-dom'

import SystemLogo from '../components/branding/SystemLogo'

import {
  useAppPreferences,
} from '../context/useAppPreferences'

import {
  hasPermission,
  type Permission,
} from '../services/permissions'

/* =============================================================
   APP SIDEBAR

   Primary navigation, grouped by intent:

     MONITOR    Dashboard · Activity        (what is happening)
     DIRECTORY  Persons · Cameras · Users   (the things the system knows)
     CONFIGURE  Settings                    (footer)

   Same routes, same permission gates — the grouping just gives
   the nav structure so the app doesn't read as one flat list.
============================================================= */

type NavItem = {
  name: string
  path: string
  icon: typeof LayoutDashboard
  permission?: Permission
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const GROUPS: NavGroup[] = [
  {
    label: 'Monitor',
    items: [
      {
        name: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        permission: 'view_dashboard',
      },
      {
        name: 'Activity',
        path: '/activity',
        icon: History,
        permission: 'view_activity',
      },
    ],
  },
  {
    label: 'Directory',
    items: [
      {
        name: 'Persons',
        path: '/persons',
        icon: UsersRound,
        permission: 'view_persons',
      },
      {
        name: 'Cameras',
        path: '/cameras',
        icon: Cctv,
        permission: 'view_cameras',
      },
      {
        name: 'Users & Roles',
        path: '/users',
        icon: ShieldCheck,
        permission: 'manage_users',
      },
    ],
  },
]

const FOOTER_ITEMS: NavItem[] = [
  {
    name: 'Settings',
    path: '/settings',
    icon: SlidersHorizontal,
  },
]

function isVisible(item: NavItem): boolean {
  return (
    !item.permission ||
    hasPermission(item.permission)
  )
}

function AppSidebar() {
  const { sidebarCollapsed } =
    useAppPreferences()

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white text-slate-900 transition-[width] duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-950 dark:text-white ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* brand */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-slate-200 dark:border-slate-800 ${
          sidebarCollapsed
            ? 'justify-center px-2'
            : 'px-5'
        }`}
      >
        {sidebarCollapsed ? (
          <SystemLogo
            variant="mark"
            size="sm"
          />
        ) : (
          <SystemLogo
            variant="full"
            size="sm"
          />
        )}
      </div>

      {/* nav */}
      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        {GROUPS.map((group) => {
          const items =
            group.items.filter(isVisible)

          if (items.length === 0) {
            return null
          }

          return (
            <div
              key={group.label}
              className="mb-5"
            >
              {!sidebarCollapsed && (
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-600">
                  {group.label}
                </p>
              )}

              <div className="space-y-0.5">
                {items.map((item) => (
                  <SidebarLink
                    key={item.path}
                    item={item}
                    collapsed={
                      sidebarCollapsed
                    }
                  />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* footer */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        {!sidebarCollapsed && (
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-600">
            Configure
          </p>
        )}
        <div className="space-y-0.5">
          {FOOTER_ITEMS.filter(
            isVisible,
          ).map((item) => (
            <SidebarLink
              key={item.path}
              item={item}
              collapsed={sidebarCollapsed}
            />
          ))}
        </div>
      </div>
    </aside>
  )
}

function SidebarLink({
  item,
  collapsed,
}: {
  item: NavItem
  collapsed: boolean
}) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      title={
        collapsed ? item.name : undefined
      }
      className={({ isActive }) =>
        [
          'group relative flex items-center rounded-lg text-sm font-medium transition-colors',
          collapsed
            ? 'justify-center px-2 py-2.5'
            : 'gap-3 px-3 py-2',
          isActive
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-600 transition-opacity dark:bg-blue-400 ${
              isActive
                ? 'opacity-100'
                : 'opacity-0'
            }`}
          />
          <Icon
            size={18}
            strokeWidth={
              isActive ? 2.1 : 1.8
            }
            className={`shrink-0 ${
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
            }`}
          />
          {!collapsed && (
            <span className="truncate">
              {item.name}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default AppSidebar
