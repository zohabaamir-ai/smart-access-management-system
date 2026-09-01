import {
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import {
  useLocation,
  useNavigate,
} from 'react-router-dom'

import {
  logout,
} from '../services/auth'

import {
  getProfile,
  type Profile,
} from '../services/profileService'

import {
  useAppPreferences,
} from '../context/useAppPreferences'

import ProfileMenu from '../components/layout/header/ProfileMenu'


const pageTitles: Record<
  string,
  string
> = {
  '/dashboard': 'Dashboard',
  '/persons': 'Persons',
  '/cameras': 'Cameras',
  '/activity': 'Activity',
  '/users': 'Users & Roles',
  '/settings': 'Settings',
}


function Header() {

  const navigate = useNavigate()
  const location = useLocation()


  /* =============================================================
     APP PREFERENCES
  ============================================================= */

  const {
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useAppPreferences()


  /* =============================================================
     UI STATE
  ============================================================= */

  const [
    isProfileOpen,
    setIsProfileOpen,
  ] = useState(false)

  const [
    isProfilePanelOpen,
    setIsProfilePanelOpen,
  ] = useState(false)


  /* =============================================================
     PROFILE STATE
  ============================================================= */

  const [
    profile,
    setProfile,
  ] = useState<Profile | null>(null)

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(true)


  /* =============================================================
     LOAD USER PROFILE
  ============================================================= */

  useEffect(() => {

    async function loadProfile() {

      try {

        const data =
          await getProfile()

        setProfile(data)

      } catch (error) {

        if (
          error instanceof Error &&
          error.message ===
            'AUTHENTICATION_EXPIRED'
        ) {
          return
        }

        console.error(
          'Unable to load profile:',
          error,
        )

      } finally {

        setProfileLoading(false)

      }
    }

    loadProfile()

  }, [])


  /* =============================================================
     CURRENT PAGE
  ============================================================= */

  const currentPage =
    pageTitles[
      location.pathname
    ] || 'Dashboard'


  /* =============================================================
     SIDEBAR
  ============================================================= */

  function toggleSidebar() {

    setSidebarCollapsed(
      !sidebarCollapsed,
    )

  }


  /* =============================================================
     PROFILE / ACCOUNT
  ============================================================= */

  function handleProfileMenuToggle() {

    setIsProfileOpen(
      (current) => !current,
    )

    setIsProfilePanelOpen(false)

  }


  function handleProfileDismiss() {

    setIsProfileOpen(false)

    setIsProfilePanelOpen(false)

  }


  function handleProfileToggle() {

    setIsProfilePanelOpen(true)

    setIsProfileOpen(false)

  }


  function handleProfileClose() {

    setIsProfilePanelOpen(false)

  }


  function handleProfileUpdated(
    updatedProfile: Profile,
  ) {

    setProfile(updatedProfile)

  }


  function handleSettings() {

    setIsProfileOpen(false)

    setIsProfilePanelOpen(false)

    navigate('/settings')

  }


  /* =============================================================
     LOGOUT
  ============================================================= */

  function handleLogout() {

    setIsProfileOpen(false)

    setIsProfilePanelOpen(false)

    logout()

  }


  /* =============================================================
     RENDER
  ============================================================= */

  return (
    <header className="relative z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 transition-colors sm:px-6 dark:border-slate-800 dark:bg-slate-900">


      {/* =====================================================
          LEFT SIDE
      ===================================================== */}

      <div className="flex items-center gap-3">

        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label={
            sidebarCollapsed
              ? 'Expand sidebar'
              : 'Collapse sidebar'
          }
          title={
            sidebarCollapsed
              ? 'Expand sidebar'
              : 'Collapse sidebar'
          }
        >

          {sidebarCollapsed ? (
            <PanelLeftOpen
              size={19}
            />
          ) : (
            <PanelLeftClose
              size={19}
            />
          )}

        </button>


        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />


        <h1 className="text-base font-semibold text-slate-900 sm:text-lg dark:text-white">
          {currentPage}
        </h1>

      </div>


      {/* =====================================================
          RIGHT SIDE
      ===================================================== */}

      <div className="flex items-center">

        <ProfileMenu
          profile={profile}
          profileLoading={profileLoading}
          isMenuOpen={isProfileOpen}
          isPanelOpen={isProfilePanelOpen}
          onToggleMenu={handleProfileMenuToggle}
          onDismiss={handleProfileDismiss}
          onOpenPanel={handleProfileToggle}
          onClosePanel={handleProfileClose}
          onSettings={handleSettings}
          onLogout={handleLogout}
          onProfileUpdated={handleProfileUpdated}
        />

      </div>

    </header>
  )
}


export default Header
