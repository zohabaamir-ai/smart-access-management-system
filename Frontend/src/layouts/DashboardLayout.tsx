import { useEffect, useState } from 'react'

import {
  Outlet,
  useLocation,
} from 'react-router-dom'

import Header from './AppHeader'
import Sidebar from './AppSidebar'

import CamerasProvider from '../context/cameras/CamerasProvider'
import ToastProvider from '../components/common/toast/ToastProvider'

import {
  useAppPreferences,
} from '../context/useAppPreferences'


function DashboardLayout() {
  const {
    sidebarCollapsed,
    interfaceDensity,
  } = useAppPreferences()

  const location = useLocation()

  // Below `lg` the sidebar is an off-canvas overlay (closed by
  // default) instead of a permanently docked rail — there is no
  // room for a fixed 256px column on a phone/tablet viewport.
  // At `lg` and up the layout is exactly the pre-existing desktop
  // shell, unaffected by this state.
  const [
    mobileNavOpen,
    setMobileNavOpen,
  ] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileNavOpen(false)
  }, [location.pathname])

  // Full-bleed operational surfaces (Open Camera) fill the
  // content area edge-to-edge and manage their own scrolling.
  const isImmersive =
    /^\/cameras\/[^/]+\/live\/?$/.test(
      location.pathname,
    )

  const contentPadding = isImmersive
    ? 'p-0'
    : interfaceDensity === 'comfortable'
      ? 'p-8'
      : interfaceDensity === 'compact'
        ? 'p-4'
        : 'p-6'

  return (
    <ToastProvider>
      <CamerasProvider>
        <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
          <Sidebar
            mobileOpen={mobileNavOpen}
            onCloseMobile={() =>
              setMobileNavOpen(false)
            }
          />

          <main
            className={`min-h-screen transition-[margin] duration-200 ease-in-out ${
              sidebarCollapsed
                ? 'lg:ml-20'
                : 'lg:ml-64'
            }`}
          >
            <Header
              onOpenMobileNav={() =>
                setMobileNavOpen(true)
              }
            />

            <section
              className={`${contentPadding} ${
                isImmersive
                  ? 'h-[calc(100vh-4rem)] overflow-hidden'
                  : 'min-h-[calc(100vh-4rem)]'
              }`}
            >
              <Outlet />
            </section>
          </main>
        </div>
      </CamerasProvider>
    </ToastProvider>
  )
}


export default DashboardLayout
