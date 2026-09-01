import {
  useEffect,
  useState,
} from 'react'

import type {
  InterfaceDensity,
  StartupPage,
  ThemePreference,
} from './appPreferences/types'

import { AppPreferencesContext } from './appPreferences/context'

import {
  DEFAULT_DENSITY,
  DEFAULT_REDUCE_MOTION,
  DEFAULT_SIDEBAR_COLLAPSED,
  DEFAULT_STARTUP_PAGE,
  DEFAULT_THEME,
  THEME_KEY,
} from './appPreferences/constants'

import {
  getStoredDensity,
  getStoredReduceMotion,
  getStoredSidebarCollapsed,
  getStoredStartupPage,
  getStoredTheme,
  parseTheme,
  storeDensity,
  storeReduceMotion,
  storeSidebarCollapsed,
  storeStartupPage,
  storeTheme,
} from './appPreferences/storage'

import {
  applyMotionPreference,
  applyTheme,
} from './appPreferences/dom'

export type {
  InterfaceDensity,
  StartupPage,
  ThemePreference,
} from './appPreferences/types'

export type { AppPreferencesContextValue } from './appPreferences/context'


/* =============================================================
   PROVIDER
============================================================= */

export function AppPreferencesProvider({
  children,
}: {
  children: React.ReactNode
}) {

  const [
    theme,
    setThemeState,
  ] =
    useState<ThemePreference>(
      getStoredTheme,
    )


  const [
    interfaceDensity,
    setInterfaceDensityState,
  ] =
    useState<InterfaceDensity>(
      getStoredDensity,
    )


  // Persisted preference: "start the app with the sidebar collapsed".
  const [
    startCollapsed,
    setStartCollapsedState,
  ] =
    useState(
      getStoredSidebarCollapsed,
    )

  // Live session state. Seeded once from the startup preference and
  // then driven purely by the header collapse/expand control — it is
  // never written back to storage, so manually opening the sidebar
  // does not change the saved preference.
  const [
    sidebarCollapsed,
    setSidebarCollapsedState,
  ] =
    useState(
      getStoredSidebarCollapsed,
    )


  const [
    reduceMotion,
    setReduceMotionState,
  ] =
    useState(
      getStoredReduceMotion,
    )


  const [
    startupPage,
    setStartupPageState,
  ] =
    useState<StartupPage>(
      getStoredStartupPage,
    )


  /* ===========================================================
     THEME PERSISTENCE + IMMEDIATE APPLICATION
  =========================================================== */

  useEffect(() => {

    storeTheme(theme)


    applyTheme(theme)

  }, [theme])


  /* ===========================================================
     CROSS-TAB THEME SYNCHRONIZATION

     A separately opened tab/window (e.g. the public recognition
     screen) fires a storage event; update React state here so
     it picks up the new theme without a refresh.
  =========================================================== */

  useEffect(() => {

    function handleStorageChange(
      event: StorageEvent,
    ) {

      if (
        event.key !== THEME_KEY
      ) {

        return

      }


      setThemeState(
        parseTheme(
          event.newValue,
        ),
      )

    }


    window.addEventListener(
      'storage',
      handleStorageChange,
    )


    return () => {

      window.removeEventListener(
        'storage',
        handleStorageChange,
      )

    }

  }, [])


  /* ===========================================================
     SYSTEM THEME SYNCHRONIZATION
  =========================================================== */

  useEffect(() => {

    const mediaQuery =
      window.matchMedia(
        '(prefers-color-scheme: dark)',
      )


    function handleSystemThemeChange() {

      if (theme === 'system') {

        applyTheme('system')

      }

    }


    mediaQuery.addEventListener(
      'change',
      handleSystemThemeChange,
    )


    return () => {

      mediaQuery.removeEventListener(
        'change',
        handleSystemThemeChange,
      )

    }

  }, [theme])


  /* ===========================================================
     OTHER PREFERENCES
  =========================================================== */

  useEffect(() => {

    storeDensity(
      interfaceDensity,
    )

  }, [interfaceDensity])


  useEffect(() => {

    storeSidebarCollapsed(
      startCollapsed,
    )

  }, [startCollapsed])


  useEffect(() => {

    storeReduceMotion(
      reduceMotion,
    )


    applyMotionPreference(
      reduceMotion,
    )

  }, [reduceMotion])


  useEffect(() => {

    storeStartupPage(
      startupPage,
    )

  }, [startupPage])


  /* ===========================================================
     SETTERS
  =========================================================== */

  function setTheme(
    value: ThemePreference,
  ) {

    setThemeState(
      value,
    )

  }


  function setInterfaceDensity(
    value: InterfaceDensity,
  ) {

    setInterfaceDensityState(
      value,
    )

  }


  // Header collapse/expand — session-only, does not touch the
  // saved preference.
  function setSidebarCollapsed(
    value: boolean,
  ) {

    setSidebarCollapsedState(
      value,
    )

  }


  // Settings toggle — persists the startup preference and reflects
  // it on the sidebar right away.
  function setStartCollapsed(
    value: boolean,
  ) {

    setStartCollapsedState(
      value,
    )

    setSidebarCollapsedState(
      value,
    )

  }


  function setReduceMotion(
    value: boolean,
  ) {

    setReduceMotionState(
      value,
    )

  }


  function setStartupPage(
    value: StartupPage,
  ) {

    setStartupPageState(
      value,
    )

  }


  /* ===========================================================
     RESET
  =========================================================== */

  function resetPreferences() {

    setThemeState(
      DEFAULT_THEME,
    )

    setInterfaceDensityState(
      DEFAULT_DENSITY,
    )

    setStartCollapsedState(
      DEFAULT_SIDEBAR_COLLAPSED,
    )

    setSidebarCollapsedState(
      DEFAULT_SIDEBAR_COLLAPSED,
    )

    setReduceMotionState(
      DEFAULT_REDUCE_MOTION,
    )

    setStartupPageState(
      DEFAULT_STARTUP_PAGE,
    )

  }


  return (

    <AppPreferencesContext.Provider
      value={{
        theme,
        setTheme,

        interfaceDensity,
        setInterfaceDensity,

        startCollapsed,
        setStartCollapsed,

        sidebarCollapsed,
        setSidebarCollapsed,

        reduceMotion,
        setReduceMotion,

        startupPage,
        setStartupPage,

        resetPreferences,
      }}
    >

      {children}

    </AppPreferencesContext.Provider>

  )

}
