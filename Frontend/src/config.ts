/* =============================================================
   RUNTIME CONFIGURATION

   Single source of truth for environment-derived values.
   Everything that needs the backend origin imports it from
   here (directly or via services/api).
============================================================= */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000'
