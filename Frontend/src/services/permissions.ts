import {
  getTokenPayload,
} from './auth'


export type UserRole =
  | 'operator'
  | 'admin'
  | 'super_admin'


/* =============================================================
   PERMISSION VOCABULARY

   Mirrors the finalized backend Permission enum
   (app/core/permissions.py) exactly — one string per member,
   same values. The backend is the sole authorization authority;
   this union exists only so the UI can show/hide or
   enable/disable affordances against the same vocabulary.

   Anything not in this list (e.g. the removed
   delete_activity / view_reports / export_reports /
   view_terminals / manage_terminals) is intentionally a
   TypeScript error at every call site.
============================================================= */

export type Permission =
  | 'view_dashboard'
  | 'view_persons'
  | 'manage_persons'
  | 'edit_persons'
  | 'delete_persons'
  | 'view_activity'
  | 'export_activity'
  | 'view_cameras'
  | 'manage_cameras'
  | 'create_users'
  | 'manage_users'
  | 'manage_settings'


/* =============================================================
   ROLE -> PERMISSIONS

   Mirrors app/core/permissions.py::ROLE_PERMISSIONS exactly.
   Backend checks are the source of truth; this copy only
   drives UI visibility / enablement.

   Persons  Read: all roles                 -> view_persons
            Create/enroll: all roles        -> manage_persons
            Update: SA, Admin               -> edit_persons
            Delete: SA, Admin               -> delete_persons
   Activity Read/filter: all roles          -> view_activity
            Export (CSV): SA, Admin         -> export_activity
   Cameras  Read: all roles                 -> view_cameras
            Create/Update/Decommission: SA, Admin -> manage_cameras
   Users    Create: SA (Admin/Operator), Admin (Operator only) -> create_users
            View / reset / status / unlock / delete: SA, Admin -> manage_users
            (role changes + Operator-only + sole-Super-Admin
             scoping are enforced server-side)
   Settings System config: SA only          -> manage_settings
            (personal preferences are client-side, no permission)
============================================================= */

const ROLE_PERMISSIONS: Record<
  UserRole,
  Permission[]
> = {
  operator: [
    'view_dashboard',

    'view_persons',
    'manage_persons',

    'view_activity',

    'view_cameras',
  ],

  admin: [
    'view_dashboard',

    'view_persons',
    'manage_persons',
    'edit_persons',
    'delete_persons',

    'view_activity',
    'export_activity',

    'view_cameras',
    'manage_cameras',

    'create_users',
    'manage_users',
  ],

  super_admin: [
    'view_dashboard',

    'view_persons',
    'manage_persons',
    'edit_persons',
    'delete_persons',

    'view_activity',
    'export_activity',

    'view_cameras',
    'manage_cameras',

    'create_users',
    'manage_users',
    'manage_settings',
  ],
}


export function getCurrentRole():
  UserRole | null {
  const payload =
    getTokenPayload()

  const role =
    payload?.role

  if (
    role === 'operator' ||
    role === 'admin' ||
    role === 'super_admin'
  ) {
    return role
  }

  return null
}


export function hasPermission(
  permission: Permission,
): boolean {
  const role =
    getCurrentRole()

  if (!role) {
    return false
  }

  return ROLE_PERMISSIONS[
    role
  ].includes(permission)
}


export function hasAnyPermission(
  permissions: Permission[],
): boolean {
  return permissions.some(
    hasPermission,
  )
}


export function hasAllPermissions(
  permissions: Permission[],
): boolean {
  return permissions.every(
    hasPermission,
  )
}


export function isSuperAdmin(): boolean {
  return (
    getCurrentRole() ===
    'super_admin'
  )
}


export function isAdmin(): boolean {
  return (
    getCurrentRole() ===
      'admin' ||
    getCurrentRole() ===
      'super_admin'
  )
}
