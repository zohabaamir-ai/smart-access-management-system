import { createContext } from 'react'

import type {
  InterfaceDensity,
  StartupPage,
  ThemePreference,
} from './types'

/* =============================================================
   APP PREFERENCES - CONTEXT OBJECT

   The context value shape + the context object live in their
   own module (no component export) so the provider file can be
   Fast-Refresh friendly.
============================================================= */

export type {
  InterfaceDensity,
  StartupPage,
  ThemePreference,
} from './types'


export interface AppPreferencesContextValue {
  theme: ThemePreference

  setTheme: (
    value: ThemePreference,
  ) => void

  interfaceDensity: InterfaceDensity

  setInterfaceDensity: (
    value: InterfaceDensity,
  ) => void

  /** Persisted preference: open the app with the sidebar collapsed. */
  startCollapsed: boolean

  setStartCollapsed: (
    value: boolean,
  ) => void

  /** Live session state — seeded from startCollapsed, never persisted. */
  sidebarCollapsed: boolean

  setSidebarCollapsed: (
    value: boolean,
  ) => void

  reduceMotion: boolean

  setReduceMotion: (
    value: boolean,
  ) => void

  startupPage: StartupPage

  setStartupPage: (
    value: StartupPage,
  ) => void

  resetPreferences: () => void
}


export const AppPreferencesContext =
  createContext<
    AppPreferencesContextValue | undefined
  >(undefined)
