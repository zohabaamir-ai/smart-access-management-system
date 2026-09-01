import type {
  InterfaceDensity,
  StartupPage,
  ThemePreference,
} from './types'

import {
  DENSITY_KEY,
  DEFAULT_DENSITY,
  DEFAULT_REDUCE_MOTION,
  DEFAULT_SIDEBAR_COLLAPSED,
  DEFAULT_STARTUP_PAGE,
  DEFAULT_THEME,
  REDUCE_MOTION_KEY,
  SIDEBAR_KEY,
  STARTUP_PAGE_KEY,
  THEME_KEY,
} from './constants'

/* =============================================================
   APP PREFERENCES - STORAGE

   Reading, parsing/validating and writing preferences to
   localStorage. No React state. No DOM manipulation.
============================================================= */


/* ---------- shared boolean helpers ---------- */

function getStoredBoolean(
  key: string,
  defaultValue: boolean,
): boolean {

  const stored =
    localStorage.getItem(
      key,
    )


  if (stored === null) {

    return defaultValue

  }


  return stored === 'true'

}


function storeBoolean(
  key: string,
  value: boolean,
) {

  localStorage.setItem(
    key,
    String(value),
  )

}


/* ---------- theme ---------- */

export function parseTheme(
  raw: string | null,
): ThemePreference {

  if (
    raw === 'light' ||
    raw === 'dark' ||
    raw === 'system'
  ) {

    return raw

  }


  return DEFAULT_THEME

}


export function getStoredTheme(): ThemePreference {

  return parseTheme(
    localStorage.getItem(
      THEME_KEY,
    ),
  )

}


export function storeTheme(
  theme: ThemePreference,
) {

  localStorage.setItem(
    THEME_KEY,
    theme,
  )

}


/* ---------- interface density ---------- */

export function getStoredDensity(): InterfaceDensity {

  const stored =
    localStorage.getItem(
      DENSITY_KEY,
    )


  if (
    stored === 'comfortable' ||
    stored === 'balanced' ||
    stored === 'compact'
  ) {

    return stored

  }


  return DEFAULT_DENSITY

}


export function storeDensity(
  density: InterfaceDensity,
) {

  localStorage.setItem(
    DENSITY_KEY,
    density,
  )

}


/* ---------- startup page ---------- */

export function getStoredStartupPage(): StartupPage {

  const stored =
    localStorage.getItem(
      STARTUP_PAGE_KEY,
    )


  // Only current V1 routes are valid. A value stored under an
  // earlier build (e.g. /terminals, /reports) safely falls
  // back to the default rather than stranding the user on a
  // route that no longer exists.
  if (
    stored === '/dashboard' ||
    stored === '/persons' ||
    stored === '/cameras' ||
    stored === '/activity' ||
    stored === '/settings'
  ) {

    return stored

  }


  return DEFAULT_STARTUP_PAGE

}


export function storeStartupPage(
  page: StartupPage,
) {

  localStorage.setItem(
    STARTUP_PAGE_KEY,
    page,
  )

}


/* ---------- sidebar collapsed ---------- */

export function getStoredSidebarCollapsed(): boolean {

  return getStoredBoolean(
    SIDEBAR_KEY,
    DEFAULT_SIDEBAR_COLLAPSED,
  )

}


export function storeSidebarCollapsed(
  value: boolean,
) {

  storeBoolean(
    SIDEBAR_KEY,
    value,
  )

}


/* ---------- reduce motion ---------- */

export function getStoredReduceMotion(): boolean {

  return getStoredBoolean(
    REDUCE_MOTION_KEY,
    DEFAULT_REDUCE_MOTION,
  )

}


export function storeReduceMotion(
  value: boolean,
) {

  storeBoolean(
    REDUCE_MOTION_KEY,
    value,
  )

}
