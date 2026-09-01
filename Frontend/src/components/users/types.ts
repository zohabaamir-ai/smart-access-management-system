/* =============================================================
   USERS TYPES

   Management-user domain types live with their service
   (services/userService.ts) and are re-exported here so
   component imports stay domain-local.
============================================================= */

export type {
  ManagementUser,
  ManagementRole,
  CreateUserRequest,
  CreateUserResult,
  ResetPasswordResult,
} from '../../services/userService'
