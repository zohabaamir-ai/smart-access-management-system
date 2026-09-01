import type { ReactNode } from 'react'

import type { Profile } from '../../services/profileService'

import useToast from '../common/toast/useToast'
import Drawer from '../common/Drawer'
import Button from '../common/Button'
import Alert from '../common/Alert'
import Field from '../common/Field'
import Input from '../common/Input'
import Skeleton from '../common/Skeleton'
import SectionLabel from '../common/SectionLabel'

import ProfileAvatarPicker from './ProfileAvatarPicker'
import useProfileEditor from './useProfileEditor'

/* =============================================================
   PROFILE PANEL

   The signed-in manager's own profile, in a side drawer. The
   editable identity is the display name and the account photo;
   the registered full name, username and role are shown but
   managed elsewhere (Users & Roles). The account photo is not a
   Person enrollment photo.
============================================================= */

type ProfilePanelProps = {
  open: boolean
  onClose: () => void
  onProfileUpdated?: (
    profile: Profile,
  ) => void
}

function ProfilePanel({
  open,
  onClose,
  onProfileUpdated,
}: ProfilePanelProps) {
  const toast = useToast()

  const {
    profile,
    displayName,
    setDisplayName,
    imagePreview,
    isLoading,
    isSaving,
    error,
    handleImageSelect,
    handleCancel,
    handleSave,
  } = useProfileEditor({
    onClose,
    onProfileUpdated: (updated) => {
      toast.show({
        message: 'Profile updated',
      })
      onProfileUpdated?.(updated)
    },
  })

  const currentName =
    displayName.trim() || 'User'

  const initials =
    currentName
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'

  const profileImage =
    imagePreview ||
    profile?.profile_image_url ||
    null

  return (
    <Drawer
      open={open}
      onClose={handleCancel}
      title="Your profile"
      subtitle={
        profile
          ? `@${profile.username}`
          : undefined
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={isSaving}
            disabled={isLoading || isSaving}
          >
            Save changes
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="mx-auto h-20 w-20 rounded-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <ProfileAvatarPicker
              imageUrl={profileImage}
              initials={initials}
              name={currentName}
              loading={isLoading}
              saving={isSaving}
              onImageChange={handleImageSelect}
            />
          </div>

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          <Field
            label="Display name"
            htmlFor="profile-display-name"
            hint="Shown in the header and menus across the app."
          >
            <Input
              id="profile-display-name"
              type="text"
              value={displayName}
              onChange={(e) =>
                setDisplayName(e.target.value)
              }
              maxLength={100}
              disabled={isSaving}
            />
          </Field>

          <div>
            <SectionLabel className="mb-2">
              Account
            </SectionLabel>
            <dl className="space-y-2.5 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
              <Row
                label="Full name"
                value={profile?.full_name ?? '—'}
              />
              <Row
                label="Username"
                value={
                  <span className="font-mono text-xs">
                    {profile?.username ?? '—'}
                  </span>
                }
              />
              <Row
                label="Role"
                value={
                  <span className="capitalize">
                    {(
                      profile?.role ?? ''
                    ).replace('_', ' ')}
                  </span>
                }
              />
            </dl>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              Your full name and role are
              managed by an administrator.
            </p>
          </div>
        </div>
      )}
    </Drawer>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right font-medium text-slate-900 dark:text-white">
        {value}
      </dd>
    </div>
  )
}

export default ProfilePanel
