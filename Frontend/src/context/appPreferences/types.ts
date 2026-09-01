/* =============================================================
   APP PREFERENCES - TYPES

   Public preference-related types. No runtime code.
============================================================= */


export type ThemePreference =
  | 'light'
  | 'dark'
  | 'system'


export type InterfaceDensity =
  | 'comfortable'
  | 'balanced'
  | 'compact'


export type StartupPage =
  | '/dashboard'
  | '/persons'
  | '/cameras'
  | '/activity'
  | '/settings'
