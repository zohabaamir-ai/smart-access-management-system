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
          <Sidebar />

          <main
            className={`min-h-screen transition-[margin] duration-200 ease-in-out ${
              sidebarCollapsed
                ? 'ml-20'
                : 'ml-64'
            }`}
          >
            <Header />

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
