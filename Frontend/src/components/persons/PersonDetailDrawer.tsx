import type { ReactNode } from 'react'

import {
  CalendarDays,
  Camera,
  Pencil,
  ScanFace,
  ShieldOff,
  Trash2,
} from 'lucide-react'

import useAsyncData from '../../hooks/useAsyncData'
import { getActivity } from '../../services/activityService'
import { formatRelativeTime } from '../../utils/time'

import Drawer from '../common/Drawer'
import Button from '../common/Button'
import Skeleton from '../common/Skeleton'
import SectionLabel from '../common/SectionLabel'

import PersonPhoto from './PersonPhoto'
import { formatCnic } from './cnic'
import { formatDate } from './personFormat'

import type { Person } from './types'

/* =============================================================
   PERSON DETAIL DRAWER

   The identity record: face, name, CNIC, enrollment date, and
   the person's 5 most recent recognitions (read from the
   existing GET /activity?person_id=…). Edit / Delete live in
   the footer, permission-gated by the caller.
============================================================= */

type PersonDetailDrawerProps = {
  person: Person | null
  canEdit: boolean
  canDelete: boolean
  getPhotoUrl: (personId: number) => string
  onClose: () => void
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
}

function PersonDetailDrawer({
  person,
  canEdit,
  canDelete,
  getPhotoUrl,
  onClose,
  onEdit,
  onDelete,
}: PersonDetailDrawerProps) {
  const personId = person?.id ?? 0

  const { data: events, loading } =
    useAsyncData(
      () =>
        getActivity({ personId }),
      {
        deps: [personId],
        enabled: personId !== 0,
        apiErrorFallback:
          'Unable to load recognition history.',
        networkFallback:
          'Unable to load recognition history.',
      },
    )

  const recent = (events ?? []).slice(0, 5)

  return (
    <Drawer
      open={person !== null}
      onClose={onClose}
      title={person?.name ?? 'Person'}
      subtitle="Enrolled identity"
      footer={
        person &&
        (canEdit || canDelete) ? (
          <div className="flex justify-end gap-2">
            {canEdit && (
              <Button
                variant="secondary"
                icon={<Pencil size={15} />}
                onClick={() =>
                  onEdit(person)
                }
              >
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="dangerOutline"
                icon={<Trash2 size={15} />}
                onClick={() =>
                  onDelete(person)
                }
              >
                Delete
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {person && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
            <PersonPhoto
              personId={person.id}
              photoUrl={
                person.photo_path
                  ? getPhotoUrl(person.id)
                  : null
              }
              alt={person.name}
              className="aspect-4/3 w-full object-cover"
              fallbackClassName="flex aspect-4/3 w-full items-center justify-center"
              iconSize={40}
            />
          </div>

          <dl className="space-y-3 text-sm">
            <Row
              icon={ScanFace}
              label="CNIC"
              value={
                person.redacted ? (
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <ShieldOff size={13} />
                    Hidden for your role
                  </span>
                ) : (
                  <span className="font-mono">
                    {formatCnic(
                      person.identifier,
                    )}
                  </span>
                )
              }
            />
            <Row
              icon={CalendarDays}
              label="Enrolled"
              value={
                <span className="tnum">
                  {formatDate(
                    person.created_at,
                  )}
                </span>
              }
            />
          </dl>

          <div>
            <SectionLabel className="mb-2">
              Recent recognitions
            </SectionLabel>

            {loading ? (
              <div className="space-y-2">
                {Array.from({
                  length: 3,
                }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-11 w-full"
                  />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
                No recognitions recorded for
                this person yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {recent.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800">
                      <Camera size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-slate-900 dark:text-white">
                        {event.camera_name}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500 dark:text-slate-500">
                        {event.camera_location}
                      </span>
                    </span>
                    <span className="tnum shrink-0 text-[11px] text-slate-500 dark:text-slate-500">
                      {formatRelativeTime(
                        event.timestamp,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Icon size={14} />
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right font-medium text-slate-900 dark:text-white">
        {value}
      </dd>
    </div>
  )
}

export default PersonDetailDrawer
