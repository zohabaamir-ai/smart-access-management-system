import {
  KeyRound,
  LockOpen,
  Power,
  ShieldCheck,
  SquarePen,
  Trash2,
  UsersRound,
} from 'lucide-react'

import Avatar from '../common/Avatar'
import Card from '../common/Card'
import Skeleton from '../common/Skeleton'
import EmptyState from '../common/EmptyState'
import { StatusDot } from '../common/StatusDot'
import Highlight from '../common/Highlight'
import ShowMoreBar from '../common/ShowMoreBar'
import {
  Menu,
  MenuItem,
} from '../common/Menu'
import usePagedList from '../../hooks/usePagedList'

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
   USER TABLE

   One row per management account. Identity concepts stay
   distinct: original name (full_name), display name, username,
   role and status. Row actions appear only when the current
   manager may perform them — the backend re-checks every call.

   25 rows per page, "Show more" in steps of 25.
============================================================= */

const PAGE = 25

type UserTableProps = {
  users: ManagementUser[]
  isLoading: boolean
  searchQuery: string
  resetKey: string
  currentUserId: number
  canManageRow: (
    user: ManagementUser,
  ) => boolean
  canChangeRole: (
    user: ManagementUser,
  ) => boolean
  getPhotoUrl: (
    user: ManagementUser,
  ) => string | null
  onInspect: (user: ManagementUser) => void
  onEdit: (user: ManagementUser) => void
  onToggleStatus: (
    user: ManagementUser,
  ) => void
  onResetPassword: (
    user: ManagementUser,
  ) => void
  onUnlock: (user: ManagementUser) => void
  onDelete: (user: ManagementUser) => void
  onChangeRole: (
    user: ManagementUser,
    role: ManagementRole,
  ) => void
}

function UserTable({
  users,
  isLoading,
  searchQuery,
  resetKey,
  currentUserId,
  canManageRow,
  canChangeRole,
  getPhotoUrl,
  onInspect,
  onEdit,
  onToggleStatus,
  onResetPassword,
  onUnlock,
  onDelete,
  onChangeRole,
}: UserTableProps) {
  const page = usePagedList(
    users,
    PAGE,
    resetKey,
  )
  const q = searchQuery.trim()

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map(
            (_, i) => (
              <Skeleton
                key={i}
                className="h-14 w-full"
              />
            ),
          )}
        </div>
      </Card>
    )
  }

  if (users.length === 0) {
    return (
      <Card className="overflow-hidden">
        <EmptyState
          icon={UsersRound}
          title={
            searchQuery
              ? 'No matching users'
              : 'No management accounts yet'
          }
          description={
            searchQuery
              ? 'Try a different name, username or role.'
              : 'Add a management account to give someone access to this console.'
          }
        />
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full min-w-4xl text-left">
        <thead>
          <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-500">
            <th className="px-4 py-2.5">
              User
            </th>
            <th className="px-4 py-2.5">
              Username
            </th>
            <th className="px-4 py-2.5">
              Role
            </th>
            <th className="px-4 py-2.5">
              Status
            </th>
            <th className="px-4 py-2.5">
              Created
            </th>
            <th className="w-10 px-4 py-2.5" />
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {page.visible.map((user) => {
            const isSelf =
              user.id === currentUserId
            const manageable =
              canManageRow(user)
            const roleEditable =
              canChangeRole(user)

            return (
              <tr
                key={user.id}
                onClick={() =>
                  onInspect(user)
                }
                className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={user.full_name}
                      src={getPhotoUrl(user)}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="max-w-48 truncate text-sm font-medium text-slate-900 dark:text-white"
                          title={
                            user.full_name
                          }
                        >
                          <Highlight
                            text={
                              user.full_name
                            }
                            query={q}
                          />
                        </span>
                        {isSelf && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            You
                          </span>
                        )}
                      </div>
                      {user.display_name !==
                        user.full_name && (
                        <p
                          className="max-w-56 truncate text-xs text-slate-500 dark:text-slate-500"
                          title={
                            user.display_name
                          }
                        >
                          Shown as{' '}
                          <Highlight
                            text={
                              user.display_name
                            }
                            query={q}
                          />
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                  <Highlight
                    text={user.username}
                    query={q}
                  />
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${roleChipClass(
                      user.role,
                    )}`}
                  >
                    {roleLabel(user.role)}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
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
                    {user.must_change_password && (
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        Must set new password
                      </span>
                    )}
                  </div>
                </td>

                <td className="tnum px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  {formatDate(
                    user.created_at,
                  )}
                </td>

                <td
                  className="px-4 py-3 text-right"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
                  {manageable ? (
                    <Menu
                      label={`Actions for ${user.full_name}`}
                    >
                      <MenuItem
                        icon={
                          <SquarePen
                            size={15}
                          />
                        }
                        onClick={() =>
                          onEdit(user)
                        }
                      >
                        Edit details
                      </MenuItem>

                      {roleEditable &&
                        user.role !==
                          'admin' && (
                          <MenuItem
                            icon={
                              <ShieldCheck
                                size={15}
                              />
                            }
                            onClick={() =>
                              onChangeRole(
                                user,
                                'admin',
                              )
                            }
                          >
                            Make Admin
                          </MenuItem>
                        )}
                      {roleEditable &&
                        user.role !==
                          'operator' && (
                          <MenuItem
                            icon={
                              <ShieldCheck
                                size={15}
                              />
                            }
                            onClick={() =>
                              onChangeRole(
                                user,
                                'operator',
                              )
                            }
                          >
                            Make Operator
                          </MenuItem>
                        )}

                      <MenuItem
                        icon={
                          <KeyRound
                            size={15}
                          />
                        }
                        onClick={() =>
                          onResetPassword(
                            user,
                          )
                        }
                      >
                        Reset password
                      </MenuItem>
                      <MenuItem
                        icon={
                          <LockOpen
                            size={15}
                          />
                        }
                        onClick={() =>
                          onUnlock(user)
                        }
                      >
                        Unlock account
                      </MenuItem>
                      <MenuItem
                        icon={
                          <Power size={15} />
                        }
                        onClick={() =>
                          onToggleStatus(user)
                        }
                      >
                        {user.is_active
                          ? 'Disable account'
                          : 'Enable account'}
                      </MenuItem>
                      <MenuItem
                        tone="danger"
                        icon={
                          <Trash2 size={15} />
                        }
                        onClick={() =>
                          onDelete(user)
                        }
                      >
                        Delete account
                      </MenuItem>
                    </Menu>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-500">
                      —
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>

      {(page.canShowMore ||
        page.canShowLess) && (
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <ShowMoreBar
            shown={page.shown}
            total={page.total}
            canShowMore={page.canShowMore}
            canShowLess={page.canShowLess}
            onShowMore={page.showMore}
            onShowLess={page.showLess}
            noun="account"
          />
        </div>
      )}
    </Card>
  )
}

export default UserTable
