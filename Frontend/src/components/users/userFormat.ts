import type { StatusTone } from '../common/StatusDot'

import type { ManagementRole } from './types'

/* =============================================================
   USERS FORMATTERS
============================================================= */

const ROLE_LABEL: Record<
  ManagementRole,
  string
> = {
  operator: 'Operator',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

export function roleLabel(
  role: ManagementRole,
): string {
  return ROLE_LABEL[role] ?? role
}

// Role is not a health status, so it does not use the semantic
// tones. These map onto the neutral / accent chip palette only.
export function roleChipClass(
  role: ManagementRole,
): string {
  switch (role) {
    case 'super_admin':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
    case 'admin':
      return 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400'
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  }
}

export function statusTone(
  isActive: boolean,
): StatusTone {
  return isActive ? 'ok' : 'idle'
}

export function formatDate(
  timestamp: string,
): string {
  return new Date(
    timestamp,
  ).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
