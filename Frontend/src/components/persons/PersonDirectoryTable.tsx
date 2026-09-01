import {
  Pencil,
  Trash2,
  UserPlus,
  UsersRound,
} from 'lucide-react'

import Card from '../common/Card'
import Skeleton from '../common/Skeleton'
import EmptyState from '../common/EmptyState'
import Button from '../common/Button'
import Highlight from '../common/Highlight'
import ShowMoreBar from '../common/ShowMoreBar'
import {
  Menu,
  MenuItem,
} from '../common/Menu'
import usePagedList from '../../hooks/usePagedList'

import PersonPhoto from './PersonPhoto'
import { formatCnic } from './cnic'
import { formatDate } from './personFormat'

import type { PersonDirectoryViewProps } from './PersonDirectoryGrid'

/* =============================================================
   PERSON DIRECTORY TABLE

   The dense view — 25 rows per page, "Show more" in steps of
   25. Row click opens the detail drawer; the ⋮ menu is
   portalled so it is never clipped by the table's scroll box.
============================================================= */

const PAGE = 25

function PersonDirectoryTable({
  persons,
  isLoading,
  searchActive,
  canCreate,
  canEdit,
  canDelete,
  getPhotoUrl,
  query,
  resetKey,
  onAdd,
  onInspect,
  onEdit,
  onDelete,
}: PersonDirectoryViewProps) {
  const page = usePagedList(
    persons,
    PAGE,
    resetKey,
  )
  const q = query.trim()

  return (
    <Card className="overflow-hidden">
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map(
            (_, i) => (
              <Skeleton
                key={i}
                className="h-14 w-full"
              />
            ),
          )}
        </div>
      ) : persons.length === 0 ? (
        searchActive ? (
          <EmptyState
            icon={UsersRound}
            title="No matching persons"
            description="No enrolled person matches your search."
          />
        ) : (
          <EmptyState
            icon={UsersRound}
            title="No persons enrolled yet"
            description="Enroll a person with a clear, front-facing photo so cameras can recognize them."
            action={
              canCreate ? (
                <Button
                  icon={
                    <UserPlus size={16} />
                  }
                  onClick={onAdd}
                >
                  Enroll person
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-176 text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-500">
                  <th className="px-4 py-2.5">
                    Person
                  </th>
                  <th className="px-4 py-2.5">
                    CNIC
                  </th>
                  <th className="px-4 py-2.5">
                    Enrolled
                  </th>
                  <th className="w-10 px-4 py-2.5" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {page.visible.map((person) => (
                  <tr
                    key={person.id}
                    onClick={() =>
                      onInspect(person)
                    }
                    className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <PersonPhoto
                            personId={
                              person.id
                            }
                            photoUrl={
                              person.photo_path
                                ? getPhotoUrl(
                                    person.id,
                                  )
                                : null
                            }
                            alt={person.name}
                            className="h-full w-full object-cover"
                            fallbackClassName="flex h-full w-full items-center justify-center"
                            iconSize={16}
                          />
                        </span>
                        <span
                          className="truncate text-sm font-medium text-slate-900 dark:text-white"
                          title={person.name}
                        >
                          <Highlight
                            text={person.name}
                            query={q}
                          />
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      <Highlight
                        text={formatCnic(
                          person.identifier,
                        )}
                        query={q}
                      />
                    </td>

                    <td className="tnum px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(
                        person.created_at,
                      )}
                    </td>

                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >
                      {(canEdit ||
                        canDelete) && (
                        <Menu
                          label={`Actions for ${person.name}`}
                        >
                          {canEdit && (
                            <MenuItem
                              icon={
                                <Pencil
                                  size={15}
                                />
                              }
                              onClick={() =>
                                onEdit(person)
                              }
                            >
                              Edit person
                            </MenuItem>
                          )}
                          {canDelete && (
                            <MenuItem
                              tone="danger"
                              icon={
                                <Trash2
                                  size={15}
                                />
                              }
                              onClick={() =>
                                onDelete(
                                  person,
                                )
                              }
                            >
                              Delete person
                            </MenuItem>
                          )}
                        </Menu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(page.canShowMore ||
            page.canShowLess) && (
            <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <ShowMoreBar
                shown={page.shown}
                total={page.total}
                canShowMore={page.canShowMore}
                canShowLess={page.canShowLess}
                onShowMore={page.showMore}
                onShowLess={page.showLess}
                noun="person"
              />
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default PersonDirectoryTable
