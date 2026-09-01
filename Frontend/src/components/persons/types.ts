/* =============================================================
   PERSONS TYPES

   Person / PersonActivity live with their service
   (services/personService.ts) and are re-exported here so
   existing imports keep working. The UI-only types stay here.
============================================================= */

export type {
  Person,
  PersonActivity,
} from '../../services/personService'

export type PhotoMode = 'upload' | 'camera'

// Directory layout: an identity-card grid, or a dense table.
export type PersonView = 'grid' | 'list'

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'name-asc'
  | 'name-desc'

