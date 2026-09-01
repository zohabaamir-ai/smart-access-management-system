/* =============================================================
   ACTIVITY TYPES

   ActivityEvent / ActivityFilters live with their service
   (services/activityService.ts) and are re-exported here so
   component imports stay domain-local.
============================================================= */

export type {
  ActivityEvent,
  ActivityFilters,
} from '../../services/activityService'
