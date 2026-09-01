import { useState } from 'react'

import { UserPlus } from 'lucide-react'

import {
  ApiError,
  isAuthExpired,
} from '../../services/api'
import {
  deletePerson,
  getPersonPhotoUrl,
} from '../../services/personService'
import { hasPermission } from '../../services/permissions'

import useToast from '../../components/common/toast/useToast'
import PageHeader from '../../components/common/PageHeader'
import Alert from '../../components/common/Alert'
import Button from '../../components/common/Button'
import ConfirmModal from '../../components/common/ConfirmModal'

import PersonDirectoryToolbar from '../../components/persons/PersonDirectoryToolbar'
import PersonDirectoryGrid from '../../components/persons/PersonDirectoryGrid'
import PersonDirectoryTable from '../../components/persons/PersonDirectoryTable'
import PersonDetailDrawer from '../../components/persons/PersonDetailDrawer'
import PersonFormModal from '../../components/persons/PersonFormModal'
import usePersonDirectory from '../../components/persons/usePersonDirectory'

import type { Person } from '../../components/persons/types'

/* =============================================================
   PERSONS  — the identity directory

   A face-first card grid (or a dense table) of everyone the
   system can recognize. Selecting a person opens a detail
   drawer with their enrollment record and recent recognitions.
============================================================= */

function PersonsPage() {
  const toast = useToast()

  // PERMISSIONS.md → Persons:
  //   Create: all roles   Update / Delete: Super Admin, Admin
  const canCreate = hasPermission('manage_persons')
  const canEdit = hasPermission('edit_persons')
  const canDelete = hasPermission('delete_persons')

  const {
    persons,
    setPersons,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    view,
    setView,
    sortOption,
    setSortOption,
    filteredPersons,
    fetchPersons,
  } = usePersonDirectory()

  const [photoVersions, setPhotoVersions] =
    useState<Record<number, number>>({})

  const [inspecting, setInspecting] =
    useState<Person | null>(null)

  const [formMode, setFormMode] = useState<
    'add' | 'edit' | null
  >(null)
  const [selectedPerson, setSelectedPerson] =
    useState<Person | null>(null)

  const [deleteTarget, setDeleteTarget] =
    useState<Person | null>(null)
  const [isDeleting, setIsDeleting] =
    useState(false)
  const [deleteError, setDeleteError] =
    useState('')

  function getPhotoUrl(personId: number) {
    return getPersonPhotoUrl(
      personId,
      photoVersions[personId] ?? 0,
    )
  }

  function bumpPhoto(personId: number) {
    setPhotoVersions((current) => ({
      ...current,
      [personId]:
        (current[personId] ?? 0) + 1,
    }))
  }

  /* ---------- add / edit ---------- */

  function openAdd() {
    setSelectedPerson(null)
    setFormMode('add')
  }

  function openEdit(person: Person) {
    setSelectedPerson(person)
    setFormMode('edit')
  }

  function closeForm() {
    setFormMode(null)
    setSelectedPerson(null)
  }

  async function handleFormSaved({
    message,
    photoChanged,
  }: {
    message: string
    photoChanged: boolean
  }) {
    toast.show({ message })
    if (photoChanged && selectedPerson) {
      bumpPhoto(selectedPerson.id)
    }
    await fetchPersons()
    closeForm()
  }

  /* ---------- delete ---------- */

  function openDelete(person: Person) {
    setDeleteTarget(person)
    setDeleteError('')
  }

  function closeDelete() {
    if (isDeleting) return
    setDeleteTarget(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deletePerson(deleteTarget.id)
      const name = deleteTarget.name
      setPersons((current) =>
        current.filter(
          (p) => p.id !== deleteTarget.id,
        ),
      )
      setInspecting((current) =>
        current?.id === deleteTarget.id
          ? null
          : current,
      )
      setDeleteTarget(null)
      toast.show({
        message: `${name} deleted`,
      })
    } catch (caught) {
      if (isAuthExpired(caught)) return
      setDeleteError(
        caught instanceof ApiError
          ? caught.detail ||
              'Could not delete this person.'
          : 'Unable to connect to the access management server.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  /* ---------- derived ---------- */

  const searchActive =
    searchQuery.trim() !== ''

  const viewProps = {
    persons: filteredPersons,
    isLoading,
    searchActive,
    canCreate,
    canEdit,
    canDelete,
    getPhotoUrl,
    query: searchQuery,
    resetKey: `${searchQuery.trim()}|${sortOption}`,
    onAdd: openAdd,
    onInspect: setInspecting,
    onEdit: openEdit,
    onDelete: openDelete,
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Persons"
        description="View and manage the persons for the system to recognize."
        meta={
          persons.length > 0
            ? `${persons.length} enrolled`
            : undefined
        }
        actions={
          canCreate && (
            <Button
              icon={<UserPlus size={16} />}
              onClick={openAdd}
            >
              Enroll person
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      <PersonDirectoryToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOption={sortOption}
        onSortChange={setSortOption}
        view={view}
        onViewChange={setView}
      />

      {view === 'grid' ? (
        <PersonDirectoryGrid {...viewProps} />
      ) : (
        <PersonDirectoryTable {...viewProps} />
      )}

      <PersonDetailDrawer
        person={inspecting}
        canEdit={canEdit}
        canDelete={canDelete}
        getPhotoUrl={getPhotoUrl}
        onClose={() => setInspecting(null)}
        onEdit={(p) => {
          setInspecting(null)
          openEdit(p)
        }}
        onDelete={(p) => {
          setInspecting(null)
          openDelete(p)
        }}
      />

      {formMode && (
        <PersonFormModal
          mode={formMode}
          person={selectedPerson}
          getPhotoUrl={getPhotoUrl}
          onClose={closeForm}
          onSaved={handleFormSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete person?"
          description={
            <>
              <span className="font-medium text-slate-900 dark:text-white">
                {deleteTarget.name}
              </span>{' '}
              and their recognition records
              will be permanently removed.
            </>
          }
          confirmLabel={
            isDeleting
              ? 'Deleting…'
              : 'Delete person'
          }
          loading={isDeleting}
          error={deleteError}
          onCancel={closeDelete}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

export default PersonsPage
