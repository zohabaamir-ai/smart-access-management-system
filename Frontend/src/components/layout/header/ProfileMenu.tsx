import {
  ChevronDown,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react'

import type { Profile } from '../../../services/profileService'

import useDismiss from '../../../hooks/useDismiss'
import Avatar from '../../common/Avatar'

import ProfilePanel from '../../profile/ProfilePanel'

/* =============================================================
   PROFILE MENU

   Header account trigger + dropdown + the profile drawer. The
   name shown is the management user's display_name (never
   full_name, never username).
============================================================= */

type ProfileMenuProps = {
  profile: Profile | null
  profileLoading: boolean
  isMenuOpen: boolean
  isPanelOpen: boolean
  onToggleMenu: () => void
  onDismiss: () => void
  onOpenPanel: () => void
  onClosePanel: () => void
  onSettings: () => void
  onLogout: () => void
  onProfileUpdated: (
    updatedProfile: Profile,
  ) => void
}

function ProfileMenu({
  profile,
  profileLoading,
  isMenuOpen,
  isPanelOpen,
  onToggleMenu,
  onDismiss,
  onOpenPanel,
  onClosePanel,
  onSettings,
  onLogout,
  onProfileUpdated,
}: ProfileMenuProps) {
  const containerRef =
    useDismiss<HTMLDivElement>(
      isMenuOpen || isPanelOpen,
      onDismiss,
      { closeOnEscape: false },
    )

  const displayName =
    profile?.display_name || 'Account'
  const role = profile?.role || 'operator'
  const roleLabel =
    role.charAt(0).toUpperCase() +
    role.slice(1).replace('_', ' ')
  const photo =
    profile?.profile_image_url || null

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={onToggleMenu}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-expanded={
          isMenuOpen || isPanelOpen
        }
      >
        <Avatar
          name={displayName}
          src={photo}
          size="sm"
        />

        <span className="hidden text-left sm:block">
          <span className="block max-w-32 truncate text-sm font-medium text-slate-900 dark:text-white">
            {profileLoading
              ? 'Loading…'
              : displayName}
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            {roleLabel}
          </span>
        </span>

        <ChevronDown
          size={15}
          className={`hidden text-slate-500 transition-transform sm:block ${
            isMenuOpen || isPanelOpen
              ? 'rotate-180'
              : ''
          }`}
        />
      </button>

      {isMenuOpen && !isPanelOpen && (
        <div className="elevation-1 absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 dark:border-slate-800">
            <Avatar
              name={displayName}
              src={photo}
              size="md"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {displayName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {roleLabel}
              </p>
            </div>
          </div>

          <div className="p-1.5">
            <button
              type="button"
              onClick={onOpenPanel}
              className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <UserRound size={16} />
              Profile
            </button>
            <button
              type="button"
              onClick={onSettings}
              className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Settings size={16} />
              Settings
            </button>
          </div>

          <div className="border-t border-slate-100 p-1.5 dark:border-slate-800">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}

      {isPanelOpen && (
        <ProfilePanel
          open
          onClose={onClosePanel}
          onProfileUpdated={onProfileUpdated}
        />
      )}
    </div>
  )
}

export default ProfileMenu
