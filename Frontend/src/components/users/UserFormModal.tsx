import { useState } from 'react'

import type { FormEvent } from 'react'

import { X } from 'lucide-react'

import {
  ApiError,
  isAuthExpired,
} from '../../services/api'
import {
  createUser,
  updateUserIdentity,
} from '../../services/userService'

import Modal from '../common/Modal'
import Alert from '../common/Alert'
import Button from '../common/Button'
import Field from '../common/Field'
import Input from '../common/Input'
import Select from '../common/Select'
import IconButton from '../common/IconButton'

import { roleLabel } from './userFormat'

import type {
  CreateUserResult,
  ManagementRole,
  ManagementUser,
} from './types'

/* =============================================================
   USER FORM MODAL

   Add: full name + username + role (+ optional display name);
   the backend returns a one-time temporary password.
   Edit: only the two name fields the backend allows. Username
   and role are read-only here (role has its own flow).
============================================================= */

type UserFormModalProps = {
  mode: 'add' | 'edit'
  user: ManagementUser | null
  assignableRoles: ManagementRole[]
  onClose: () => void
  onCreated: (
    result: CreateUserResult,
  ) => void | Promise<void>
  onUpdated: (
    user: ManagementUser,
  ) => void | Promise<void>
}

function UserFormModal({
  mode,
  user,
  assignableRoles,
  onClose,
  onCreated,
  onUpdated,
}: UserFormModalProps) {
  const isEdit = mode === 'edit'

  const [fullName, setFullName] = useState(
    user?.full_name ?? '',
  )
  const [displayName, setDisplayName] =
    useState(user?.display_name ?? '')
  const [username, setUsername] = useState('')
  const [role, setRole] =
    useState<ManagementRole>(
      assignableRoles[0] ?? 'operator',
    )
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] =
    useState(false)

  function handleClose() {
    if (isSubmitting) return
    onClose()
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')

    const fn = fullName.trim()
    const dn = displayName.trim()
    const un = username.trim()

    setIsSubmitting(true)
    try {
      if (isEdit && user) {
        const nameChanged =
          fn !== user.full_name
        const displayChanged =
          dn !== user.display_name

        if (!nameChanged && !displayChanged) {
          setError('Nothing has changed yet.')
          setIsSubmitting(false)
          return
        }
        if (nameChanged && !fn) {
          setError(
            'Full name cannot be empty.',
          )
          setIsSubmitting(false)
          return
        }
        if (displayChanged && !dn) {
          setError(
            'Display name cannot be empty.',
          )
          setIsSubmitting(false)
          return
        }

        const updated =
          await updateUserIdentity(user.id, {
            ...(nameChanged
              ? { full_name: fn }
              : {}),
            ...(displayChanged
              ? { display_name: dn }
              : {}),
          })
        await onUpdated(updated)
      } else {
        if (!fn || !un) {
          setError(
            'Full name and username are both required.',
          )
          setIsSubmitting(false)
          return
        }
        const result = await createUser({
          full_name: fn,
          username: un,
          role,
          ...(dn
            ? { display_name: dn }
            : {}),
        })
        await onCreated(result)
      }
    } catch (caught) {
      if (isAuthExpired(caught)) return
      setError(
        caught instanceof ApiError
          ? caught.detail ||
              (isEdit
                ? 'Could not update this user.'
                : 'Could not create this user.')
          : 'Unable to connect to the access management server.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      size="md"
      clipOverflow={false}
      panelClassName="max-h-[92vh] overflow-y-auto"
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {isEdit
              ? 'Edit user'
              : 'Add user'}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {isEdit
              ? 'Update the account name fields. Role and status have their own actions.'
              : 'A one-time temporary password is generated on creation.'}
          </p>
        </div>
        <IconButton
          label="Close"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          <X size={17} />
        </IconButton>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-5 px-5 py-5">
          <Field
            label="Full name"
            htmlFor="user-full-name"
            required
            hint="The person's original, registered name."
          >
            <Input
              id="user-full-name"
              type="text"
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value)
              }
              placeholder="e.g. Ali Raza"
              required
              disabled={isSubmitting}
            />
          </Field>

          <Field
            label="Display name"
            htmlFor="user-display-name"
            labelAside="Optional"
            hint="Shown in the header and menus. Does not replace the registered name."
          >
            <Input
              id="user-display-name"
              type="text"
              value={displayName}
              onChange={(e) =>
                setDisplayName(e.target.value)
              }
              placeholder={
                isEdit
                  ? ''
                  : 'Defaults to the full name'
              }
              disabled={isSubmitting}
            />
          </Field>

          {isEdit && user ? (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Username">
                <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                  {user.username}
                </div>
              </Field>
              <Field label="Role">
                <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                  {roleLabel(user.role)}
                </div>
              </Field>
            </div>
          ) : (
            <>
              <Field
                label="Username"
                htmlFor="user-username"
                required
              >
                <Input
                  id="user-username"
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  placeholder="e.g. ali.raza"
                  required
                  disabled={isSubmitting}
                />
              </Field>

              <Field
                label="Role"
                htmlFor="user-role"
              >
                <Select
                  id="user-role"
                  value={role}
                  onChange={(e) =>
                    setRole(
                      e.target
                        .value as ManagementRole,
                    )
                  }
                  disabled={isSubmitting}
                >
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
          >
            {isEdit
              ? 'Save changes'
              : 'Create user'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default UserFormModal
