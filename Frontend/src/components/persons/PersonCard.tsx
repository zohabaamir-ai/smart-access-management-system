import {
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'

import {
  Menu,
  MenuItem,
} from '../common/Menu'
import Highlight from '../common/Highlight'

import PersonPhoto from './PersonPhoto'
import { formatCnic } from './cnic'
import { formatDate } from './personFormat'

import type { Person } from './types'

/* =============================================================
   PERSON CARD

   One enrolled identity: the face first, then the name, CNIC
   and enrollment date. The card body opens the detail drawer;
   management actions sit behind the ⋮ menu.
============================================================= */

type PersonCardProps = {
  person: Person
  photoUrl: string | null
  query?: string
  canEdit: boolean
  canDelete: boolean
  onInspect: (person: Person) => void
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
}

function PersonCard({
  person,
  photoUrl,
  query = '',
  canEdit,
  canDelete,
  onInspect,
  onEdit,
  onDelete,
}: PersonCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <button
        type="button"
        onClick={() => onInspect(person)}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <div className="aspect-4/3 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <PersonPhoto
            personId={person.id}
            photoUrl={photoUrl}
            alt={person.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            fallbackClassName="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800"
            iconSize={28}
          />
        </div>

        <div className="p-3.5">
          <p
            className="truncate text-[15px] font-semibold text-slate-900 dark:text-white"
            title={person.name}
          >
            <Highlight
              text={person.name}
              query={query}
            />
          </p>

          <p className="mt-0.5 truncate font-mono text-xs text-slate-500 dark:text-slate-500">
            <Highlight
              text={formatCnic(
                person.identifier,
              )}
              query={query}
            />
          </p>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Enrolled{' '}
            <span className="tnum">
              {formatDate(person.created_at)}
            </span>
          </p>
        </div>
      </button>

      {(canEdit || canDelete) && (
        <div className="absolute right-2 top-2">
          <Menu
            label={`Actions for ${person.name}`}
            trigger={({ open, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Actions for ${person.name}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/90 text-slate-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <MoreVertical size={16} />
              </button>
            )}
          >
            {canEdit && (
              <MenuItem
                icon={<Pencil size={15} />}
                onClick={() => onEdit(person)}
              >
                Edit person
              </MenuItem>
            )}
            {canDelete && (
              <MenuItem
                tone="danger"
                icon={<Trash2 size={15} />}
                onClick={() =>
                  onDelete(person)
                }
              >
                Delete person
              </MenuItem>
            )}
          </Menu>
        </div>
      )}
    </div>
  )
}

export default PersonCard
