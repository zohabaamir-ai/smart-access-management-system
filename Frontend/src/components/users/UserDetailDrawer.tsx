import type { ReactNode } from 'react'

import {
  KeyRound,
  LockOpen,
  Power,
  SquarePen,
  Trash2,
} from 'lucide-react'

import Drawer from '../common/Drawer'
import Avatar from '../common/Avatar'
import Button from '../common/Button'
import Select from '../common/Select'
import SectionLabel from '../common/SectionLabel'
import { StatusDot } from '../common/StatusDot'

import {
  formatDate,
  roleChipClass,
  roleLabel,
  statusTone,
} from './userFormat'

import type {
  ManagementRole,
  ManagementUser,
} from './types'

/* =============================================================
   USER DETAIL DRAWER

   One management account, organised the way an admin thinks
   about it:

     Identity   — who this is (names, username, created)
     Access     — what they can do (role)
     Security   — password reset, unlock, forced-change state
     Danger     — disable / delete

   Every action is gated by the caller (canManageRow /
   canChangeRole); the backend re-checks each one.
============================================================= */

type UserDetailDrawerProps = {
  user: ManagementUser | null
  isSelf: boolean
  manageable: boolean
  roleEditable: boolean
  getPhotoUrl: (
    user: ManagementUser,
  ) => string | null
  onClose: () => void
  onEdit: (user: ManagementUser) => void
  onChangeRole: (
    user: ManagementUser,
    role: ManagementRole,
  ) => void
  onResetPassword: (
    user: ManagementUser,
  ) => void
  onUnlock: (user: ManagementUser) => void
  onToggleStatus: (
    user: ManagementUser,
  ) => void
  onDelete: (user: ManagementUser) => void
}

function UserDetailDrawer({
  user,
  isSelf,
  manageable,
  roleEditable,
  getPhotoUrl,
  onClose,
  onEdit,
  onChangeRole,
  onResetPassword,
  onUnlock,
  onToggleStatus,
  onDelete,
}: UserDetailDrawerProps) {
  return (
    <Drawer
      open={user !== null}
      onClose={onClose}
      title={user?.full_name ?? 'User'}
      subtitle="Management account"
      headerRight={
        user && (
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${roleChipClass(
              user.role,
            )}`}
          >
            {roleLabel(user.role)}
          </span>
        )
      }
    >
      {user && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Avatar
              name={user.full_name}
              src={getPhotoUrl(user)}
              size="lg"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {user.display_name}
              </p>
              <StatusDot
                tone={statusTone(
                  user.is_active,
                )}
                label={
                  user.is_active
                    ? 'Active'
                    : 'Disabled'
                }
              />
            </div>
          </div>

          {isSelf && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              This is your own account. Change
              your display name and photo from
              your profile; role and status are
              managed by another administrator.
            </p>
          )}

          {/* IDENTITY */}
          <Group label="Identity">
            <Row
              label="Full name"
              value={user.full_name}
            />
            <Row
              label="Display name"
              value={user.display_name}
            />
            <Row
              label="Username"
              value={
                <span className="font-mono text-xs">
                  {user.username}
                </span>
              }
            />
            <Row
              label="Created"
              value={
                <span className="tnum">
                  {formatDate(
                    user.created_at,
                  )}
                </span>
              }
            />
            {manageable && (
              <div className="pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={
                    <SquarePen size={14} />
                  }
                  onClick={() =>
                    onEdit(user)
                  }
                >
                  Edit names
                </Button>
              </div>
            )}
          </Group>

          {/* ACCESS */}
          <Group label="Access">
            <Row
              label="Role"
              value={roleLabel(user.role)}
            />
            {roleEditable ? (
              <div className="pt-1">
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Change role
                </label>
                <Select
                  value={user.role}
                  onChange={(e) => {
                    const next = e.target
                      .value as ManagementRole
                    if (next !== user.role) {
                      onChangeRole(user, next)
                    }
                  }}
                >
                  <option value="operator">
                    Operator
                  </option>
                  <option value="admin">
                    Admin
                  </option>
                </Select>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-500">
                  Changing the role signs the
                  user out of all sessions.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-500">
                {user.role === 'super_admin'
                  ? 'The Super Admin role cannot be changed.'
                  : 'Only the Super Admin can change roles.'}
              </p>
            )}
          </Group>

          {/* SECURITY */}
          {manageable && (
            <Group label="Security">
              <Row
                label="Password status"
                value={
                  user.must_change_password ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      Must set a new password
                    </span>
                  ) : (
                    'Set by the user'
                  )
                }
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={
                    <KeyRound size={14} />
                  }
                  onClick={() =>
                    onResetPassword(user)
                  }
                >
                  Reset password
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={
                    <LockOpen size={14} />
                  }
                  onClick={() =>
                    onUnlock(user)
                  }
                >
                  Unlock account
                </Button>
              </div>
            </Group>
          )}

          {/* DANGER ZONE */}
          {manageable && (
            <div className="rounded-xl border border-red-200 p-4 dark:border-red-900/50">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-red-500 dark:text-red-400">
                Danger zone
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Power size={14} />}
                  onClick={() =>
                    onToggleStatus(user)
                  }
                >
                  {user.is_active
                    ? 'Disable account'
                    : 'Enable account'}
                </Button>
                <Button
                  variant="dangerOutline"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() =>
                    onDelete(user)
                  }
                >
                  Delete account
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}

function Group({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <SectionLabel className="mb-2">
        {label}
      </SectionLabel>
      <div className="space-y-2.5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        {children}
      </div>
    </div>
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
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="min-w-0 truncate text-right font-medium text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  )
}

export default UserDetailDrawer
