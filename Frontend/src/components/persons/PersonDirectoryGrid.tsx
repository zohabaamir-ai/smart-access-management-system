import { UserPlus, UsersRound } from 'lucide-react'

import Skeleton from '../common/Skeleton'
import EmptyState from '../common/EmptyState'
import Button from '../common/Button'
import ShowMoreBar from '../common/ShowMoreBar'
import usePagedList from '../../hooks/usePagedList'

import PersonCard from './PersonCard'

import type { Person } from './types'

/* =============================================================
   PERSON DIRECTORY GRID

   The identity-card view — 12 per page, "Show more" in steps of
   12. Skeleton cards while loading, a search-aware empty state
   otherwise.
============================================================= */

const PAGE = 12

export type PersonDirectoryViewProps = {
  persons: Person[]
  isLoading: boolean
  searchActive: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  getPhotoUrl: (personId: number) => string
  query: string
  resetKey: string
  onAdd: () => void
  onInspect: (person: Person) => void
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
}

function PersonDirectoryGrid({
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

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map(
          (_, i) => (
            <Skeleton
              key={i}
              className="h-64 w-full rounded-xl"
            />
          ),
        )}
      </div>
    )
  }

  if (persons.length === 0) {
    return searchActive ? (
      <EmptyState
        icon={UsersRound}
        title="No matching persons"
        description="No enrolled person matches your search. Try a different name or CNIC."
      />
    ) : (
      <EmptyState
        icon={UsersRound}
        title="No persons enrolled yet"
        description="Enroll a person with a clear, front-facing photo so cameras can recognize them."
        action={
          canCreate ? (
            <Button
              icon={<UserPlus size={16} />}
              onClick={onAdd}
            >
              Enroll person
            </Button>
          ) : undefined
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {page.visible.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
            query={query}
            photoUrl={
              person.photo_path
                ? getPhotoUrl(person.id)
                : null
            }
            canEdit={canEdit}
            canDelete={canDelete}
            onInspect={onInspect}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {(page.canShowMore ||
        page.canShowLess) && (
        <ShowMoreBar
          shown={page.shown}
          total={page.total}
          canShowMore={page.canShowMore}
          canShowLess={page.canShowLess}
          onShowMore={page.showMore}
          onShowLess={page.showLess}
          noun="person"
        />
      )}
    </div>
  )
}

export default PersonDirectoryGrid
