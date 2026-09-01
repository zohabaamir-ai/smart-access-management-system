import { request } from './api'

/* =============================================================
   USER SERVICE  (management users, i.e. admin accounts)

   The finalized Users & Roles backend (app/api/routes/user_routes.py,
   app/schemas/auth_schemas.py, app/services/auth_service.py).
   All routes use the authenticated request() transport.

     GET    /users                       MANAGE_USERS   -> ManagementUser[]
     POST   /users                       CREATE_USERS   -> CreateUserResult
     PATCH  /users/{id}                  MANAGE_USERS   -> ManagementUser   (full_name / display_name only)
     PATCH  /users/{id}/status?is_active MANAGE_USERS   -> StatusResult      (query param)
     PATCH  /users/{id}/role?role        MANAGE_USERS   -> RoleResult        (query param, Super Admin only)
     POST   /users/{id}/reset-password   MANAGE_USERS   -> ResetPasswordResult
     PATCH  /users/{id}/unlock           MANAGE_USERS   -> UnlockResult
     DELETE /users/{id}                  MANAGE_USERS   -> DeleteResult

   A management user is NOT a Person. profile_image_url is the
   same self-service header photo (PATCH /auth/profile) — never a
   Person enrollment face. It is display-only here; there is no
   backend endpoint to set another user's photo.
============================================================= */

export type ManagementRole =
  | 'operator'
  | 'admin'
  | 'super_admin'

// One row of GET /users, mirroring auth_schemas.py :: AdminResponse.
export interface ManagementUser {
  id: number
  // Original / registered identity. Set at creation; editable
  // by a manager, never overwritten by the user's display_name.
  full_name: string
  // Name shown in the app header/menus. Self-editable via the
  // Profile page. Presentation only.
  display_name: string
  username: string
  role: ManagementRole
  profile_image_url: string | null
  is_active: boolean
  must_change_password: boolean
  created_at: string
}

// POST /users only collects one name; display_name defaults to
// it server-side. role defaults to "operator".
export interface CreateUserRequest {
  full_name: string
  username: string
  role: ManagementRole
  display_name?: string
}

// The temporary password is returned once, on creation and on
// an administrative reset. It is never retrievable again.
export interface CreateUserResult {
  id: number
  full_name: string
  username: string
  role: ManagementRole
  temporary_password: string
}

export interface ResetPasswordResult {
  message: string
  user_id: number
  username: string
  temporary_password: string
}

export interface StatusResult {
  message: string
  id: number
  username: string
  is_active: boolean
}

export interface RoleResult {
  message: string
  id: number
  username: string
  role: ManagementRole
}

export interface UnlockResult {
  message: string
  id: number
  username: string
  failed_login_attempts: number
  locked_until: string | null
}

export interface DeleteResult {
  message: string
  id: number
  username: string
}

export function getUsers(): Promise<ManagementUser[]> {
  return request<ManagementUser[]>(
    '/users',
    {},
    'Unable to load users.',
  )
}

export function createUser(
  payload: CreateUserRequest,
): Promise<CreateUserResult> {
  return request<CreateUserResult>(
    '/users',
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify(payload),
    },
    'Unable to create user.',
  )
}

// full_name and/or display_name only. Backend rejects an empty
// payload with 400.
export function updateUserIdentity(
  userId: number,
  payload: {
    full_name?: string
    display_name?: string
  },
): Promise<ManagementUser> {
  return request<ManagementUser>(
    `/users/${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify(payload),
    },
    'Unable to update user.',
  )
}

export function setUserStatus(
  userId: number,
  isActive: boolean,
): Promise<StatusResult> {
  return request<StatusResult>(
    `/users/${userId}/status?is_active=${isActive}`,
    { method: 'PATCH' },
    'Unable to update user status.',
  )
}

export function setUserRole(
  userId: number,
  role: ManagementRole,
): Promise<RoleResult> {
  return request<RoleResult>(
    `/users/${userId}/role?role=${encodeURIComponent(role)}`,
    { method: 'PATCH' },
    'Unable to update user role.',
  )
}

export function resetUserPassword(
  userId: number,
): Promise<ResetPasswordResult> {
  return request<ResetPasswordResult>(
    `/users/${userId}/reset-password`,
    { method: 'POST' },
    'Unable to reset password.',
  )
}

export function unlockUser(
  userId: number,
): Promise<UnlockResult> {
  return request<UnlockResult>(
    `/users/${userId}/unlock`,
    { method: 'PATCH' },
    'Unable to unlock account.',
  )
}

export function deleteUser(
  userId: number,
): Promise<DeleteResult> {
  return request<DeleteResult>(
    `/users/${userId}`,
    { method: 'DELETE' },
    'Unable to delete user.',
  )
}
