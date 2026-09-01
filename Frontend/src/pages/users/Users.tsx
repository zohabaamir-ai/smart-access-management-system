import { useState } from 'react'

import { Plus, Search } from 'lucide-react'

import {
  ApiError,
  isAuthExpired,
} from '../../services/api'
import { getTokenPayload } from '../../services/auth'
import {
  getCurrentRole,
  hasPermission,
  isSuperAdmin,
} from '../../services/permissions'
import { getProfileImageUrl } from '../../services/profileService'
import {
  deleteUser,
  resetUserPassword,
  setUserRole,
  setUserStatus,
  unlockUser,
} from '../../services/userService'

import useToast from '../../components/common/toast/useToast'
import PageHeader from '../../components/common/PageHeader'
import Alert from '../../components/common/Alert'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'

import UserTable from '../../components/users/UserTable'
import UserDetailDrawer from '../../components/users/UserDetailDrawer'
import UserFormModal from '../../components/users/UserFormModal'
import TemporaryPasswordModal from '../../components/users/TemporaryPasswordModal'
import useUserDirectory from '../../components/users/useUserDirectory'
import { roleLabel } from '../../components/users/userFormat'

import type {
  CreateUserResult,
  ManagementRole,
  ManagementUser,
} from '../../components/users/types'

/* =============================================================
   USERS & ROLES

   The management-account console. Roles: Super Admin (exactly
   one), Admin, Operator. Affordance visibility mirrors the
   backend authorization rules; the backend enforces them again
   on every call.
============================================================= */

type PendingAction = {
  kind: 'disable' | 'delete' | 'reset' | 'role'
  user: ManagementUser
  role?: ManagementRole
}

function UsersPage() {
  const toast = useToast()

  const payload = getTokenPayload()
  const currentUserId = payload
    ? Number(payload.sub)
    : -1
  const currentRole = getCurrentRole()

  const canCreateUsers = hasPermission(
    'create_users',
  )

  const assignableRoles: ManagementRole[] =
    isSuperAdmin()
      ? ['admin', 'operator']
      : currentRole === 'admin'
        ? ['operator']
        : []

  const {
    users,
    setUsers,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filteredUsers,
    fetchUsers,
  } = useUserDirectory()

  const [inspectingId, setInspectingId] =
    useState<number | null>(null)

  const [formMode, setFormMode] = useState<
    'add' | 'edit' | null
  >(null)
  const [selectedUser, setSelectedUser] =
    useState<ManagementUser | null>(null)

  const [tempPassword, setTempPassword] =
    useState<{
      title: string
      username: string
      temporaryPassword: string
    } | null>(null)

  const [pending, setPending] =
    useState<PendingAction | null>(null)
  const [isActioning, setIsActioning] =
    useState(false)
  const [confirmError, setConfirmError] =
    useState('')

  const inspectingUser =
    inspectingId === null
      ? null
      : (users.find(
          (u) => u.id === inspectingId,
        ) ?? null)

  /* ---------- affordance rules (mirror the backend) ---------- */

  function canManageRow(
    user: ManagementUser,
  ): boolean {
    if (user.id === currentUserId) return false
    if (user.role === 'super_admin')
      return false
    if (isSuperAdmin()) return true
    if (currentRole === 'admin')
      return user.role === 'operator'
    return false
  }

  function canChangeRole(
    user: ManagementUser,
  ): boolean {
    return (
      isSuperAdmin() &&
      canManageRow(user) &&
      user.role !== 'super_admin'
    )
  }

  function photoUrlFor(
    user: ManagementUser,
  ): string | null {
    return getProfileImageUrl(
      user.profile_image_url,
    )
  }

  function readError(
    caught: unknown,
    fallback: string,
  ): string {
    return caught instanceof ApiError
      ? caught.detail || fallback
      : 'Unable to connect to the access management server.'
  }

  /* ---------- add / edit ---------- */

  function openAdd() {
    setSelectedUser(null)
    setFormMode('add')
  }

  function openEdit(user: ManagementUser) {
    setSelectedUser(user)
    setFormMode('edit')
  }

  function closeForm() {
    setFormMode(null)
    setSelectedUser(null)
  }

  async function handleCreated(
    result: CreateUserResult,
  ) {
    setTempPassword({
      title: 'User created',
      username: result.username,
      temporaryPassword:
        result.temporary_password,
    })
    toast.show({
      message: `${result.full_name} added as ${roleLabel(result.role)}`,
    })
    await fetchUsers()
    closeForm()
  }

  function handleUpdated(
    updated: ManagementUser,
  ) {
    setUsers((current) =>
      current.map((u) =>
        u.id === updated.id ? updated : u,
      ),
    )
    toast.show({
      message: `${updated.full_name} updated`,
    })
    closeForm()
  }

  /* ---------- confirmed / direct actions ---------- */

  function requestAction(
    action: PendingAction,
  ) {
    setPending(action)
    setConfirmError('')
  }

  function closeConfirm() {
    if (isActioning) return
    setPending(null)
  }

  async function runDirect(
    kind: 'enable' | 'unlock',
    user: ManagementUser,
  ) {
    setIsActioning(true)
    try {
      if (kind === 'enable') {
        const result = await setUserStatus(
          user.id,
          true,
        )
        setUsers((current) =>
          current.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  is_active:
                    result.is_active,
                }
              : u,
          ),
        )
        toast.show({
          message: `${user.full_name} enabled`,
        })
      } else {
        await unlockUser(user.id)
        toast.show({
          message: `${user.full_name}'s account unlocked`,
        })
        await fetchUsers()
      }
    } catch (caught) {
      if (isAuthExpired(caught)) return
      toast.show({
        tone: 'fault',
        message: readError(
          caught,
          'That action could not be completed.',
        ),
      })
    } finally {
      setIsActioning(false)
    }
  }

  async function runPending() {
    if (!pending) return
    const { kind, user, role } = pending

    setIsActioning(true)
    setConfirmError('')
    try {
      if (kind === 'disable') {
        const result = await setUserStatus(
          user.id,
          false,
        )
        setUsers((current) =>
          current.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  is_active:
                    result.is_active,
                }
              : u,
          ),
        )
        toast.show({
          message: `${user.full_name} disabled`,
        })
      } else if (kind === 'delete') {
        await deleteUser(user.id)
        setUsers((current) =>
          current.filter(
            (u) => u.id !== user.id,
          ),
        )
        setInspectingId((id) =>
          id === user.id ? null : id,
        )
        toast.show({
          message: `${user.full_name} deleted`,
        })
      } else if (kind === 'reset') {
        const result =
          await resetUserPassword(user.id)
        setUsers((current) =>
          current.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  must_change_password: true,
                }
              : u,
          ),
        )
        setTempPassword({
          title: 'Password reset',
          username: result.username,
          temporaryPassword:
            result.temporary_password,
        })
        toast.show({
          message: `${user.full_name}'s password reset — sessions signed out`,
        })
      } else if (kind === 'role' && role) {
        const result = await setUserRole(
          user.id,
          role,
        )
        setUsers((current) =>
          current.map((u) =>
            u.id === user.id
              ? { ...u, role: result.role }
              : u,
          ),
        )
        toast.show({
          message: `${user.full_name} is now ${roleLabel(result.role)} — sessions signed out`,
        })
      }
      setPending(null)
    } catch (caught) {
      if (isAuthExpired(caught)) return
      setConfirmError(
        readError(
          caught,
          'That action could not be completed.',
        ),
      )
    } finally {
      setIsActioning(false)
    }
  }

  function confirmCopy(action: PendingAction): {
    title: string
    description: string
    confirmLabel: string
  } {
    const name = action.user.full_name
    switch (action.kind) {
      case 'disable':
        return {
          title: 'Disable user?',
          description: `${name} will be signed out and blocked from signing in until re-enabled.`,
          confirmLabel: 'Disable',
        }
      case 'delete':
        return {
          title: 'Delete user?',
          description: `${name}'s management account will be permanently removed.`,
          confirmLabel: 'Delete',
        }
      case 'reset':
        return {
          title: 'Reset password?',
          description: `A one-time temporary password is generated for ${name}. Their sessions are signed out and they must set a new password at next sign-in.`,
          confirmLabel: 'Reset password',
        }
      case 'role':
        return {
          title: 'Change role?',
          description: `${name} will become ${roleLabel(
            action.role ?? 'operator',
          )}. Their sessions are signed out.`,
          confirmLabel: 'Change role',
        }
    }
  }

  const tableProps = {
    users: filteredUsers,
    isLoading,
    searchQuery,
    resetKey: searchQuery.trim(),
    currentUserId,
    canManageRow,
    canChangeRole,
    getPhotoUrl: photoUrlFor,
    onInspect: (u: ManagementUser) =>
      setInspectingId(u.id),
    onEdit: openEdit,
    onToggleStatus: (u: ManagementUser) =>
      u.is_active
        ? requestAction({
            kind: 'disable',
            user: u,
          })
        : runDirect('enable', u),
    onResetPassword: (u: ManagementUser) =>
      requestAction({
        kind: 'reset',
        user: u,
      }),
    onUnlock: (u: ManagementUser) =>
      runDirect('unlock', u),
    onDelete: (u: ManagementUser) =>
      requestAction({
        kind: 'delete',
        user: u,
      }),
    onChangeRole: (
      u: ManagementUser,
      role: ManagementRole,
    ) => {
      if (role === u.role) return
      requestAction({
        kind: 'role',
        user: u,
        role,
      })
    },
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users & Roles"
        description="Management accounts and what each one can do."
        meta={
          users.length > 0
            ? `${users.length} ${
                users.length === 1
                  ? 'account'
                  : 'accounts'
              }`
            : undefined
        }
        actions={
          canCreateUsers && (
            <Button
              icon={<Plus size={16} />}
              onClick={openAdd}
            >
              Add user
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      <div className="w-full sm:max-w-xs">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) =>
            setSearchQuery(e.target.value)
          }
          onClear={() => setSearchQuery('')}
          clearLabel="Clear search"
          placeholder="Name, username or role"
          icon={<Search size={15} />}
        />
      </div>

      <UserTable {...tableProps} />

      <UserDetailDrawer
        user={inspectingUser}
        isSelf={
          inspectingUser?.id === currentUserId
        }
        manageable={
          inspectingUser
            ? canManageRow(inspectingUser)
            : false
        }
        roleEditable={
          inspectingUser
            ? canChangeRole(inspectingUser)
            : false
        }
        getPhotoUrl={photoUrlFor}
        onClose={() => setInspectingId(null)}
        onEdit={openEdit}
        onChangeRole={(u, role) => {
          if (role === u.role) return
          requestAction({
            kind: 'role',
            user: u,
            role,
          })
        }}
        onResetPassword={(u) =>
          requestAction({
            kind: 'reset',
            user: u,
          })
        }
        onUnlock={(u) =>
          runDirect('unlock', u)
        }
        onToggleStatus={(u) =>
          u.is_active
            ? requestAction({
                kind: 'disable',
                user: u,
              })
            : runDirect('enable', u)
        }
        onDelete={(u) =>
          requestAction({
            kind: 'delete',
            user: u,
          })
        }
      />

      {formMode && (
        <UserFormModal
          mode={formMode}
          user={selectedUser}
          assignableRoles={assignableRoles}
          onClose={closeForm}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}

      {tempPassword && (
        <TemporaryPasswordModal
          title={tempPassword.title}
          username={tempPassword.username}
          temporaryPassword={
            tempPassword.temporaryPassword
          }
          onClose={() =>
            setTempPassword(null)
          }
        />
      )}

      {pending && (
        <ConfirmModal
          title={confirmCopy(pending).title}
          description={
            confirmCopy(pending).description
          }
          confirmLabel={
            isActioning
              ? 'Working…'
              : confirmCopy(pending)
                  .confirmLabel
          }
          loading={isActioning}
          error={confirmError}
          onCancel={closeConfirm}
          onConfirm={runPending}
        />
      )}
    </div>
  )
}

export default UsersPage
