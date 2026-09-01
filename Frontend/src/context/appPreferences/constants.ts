import type {
  InterfaceDensity,
  StartupPage,
  ThemePreference,
} from './types'

/* =============================================================
   APP PREFERENCES - CONSTANTS

   localStorage keys and default values. Static configuration
   only - no runtime behavior.
============================================================= */


export const THEME_KEY =
  'smart_access_theme'

export const DENSITY_KEY =
  'smart_access_interface_density'

export const SIDEBAR_KEY =
  'smart_access_sidebar_collapsed'

export const REDUCE_MOTION_KEY =
  'smart_access_reduce_motion'

export const STARTUP_PAGE_KEY =
  'smart_access_startup_page'


export const DEFAULT_THEME: ThemePreference =
  'system'

export const DEFAULT_DENSITY: InterfaceDensity =
  'balanced'

export const DEFAULT_SIDEBAR_COLLAPSED =
  false

export const DEFAULT_REDUCE_MOTION =
  false

export const DEFAULT_STARTUP_PAGE: StartupPage =
  '/dashboard'
