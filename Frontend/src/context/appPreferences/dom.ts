import type { ThemePreference } from './types'

/* =============================================================
   APP PREFERENCES - DOM SIDE EFFECTS

   Browser DOM effects driven by preferences. No React state,
   no localStorage persistence.
============================================================= */


/* =============================================================
   THEME APPLICATION

   This is the single source of truth for the application's
   light/dark theme.

   The storage synchronization in the provider also lets a
   separately opened tab/window (e.g. the public recognition
   screen) react when Settings changes the theme in another
   tab/window.
============================================================= */

export function applyTheme(
  theme: ThemePreference,
) {

  const root =
    document.documentElement


  const prefersDark =
    window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches


  const shouldUseDark =
    theme === 'dark' ||
    (
      theme === 'system' &&
      prefersDark
    )


  root.classList.toggle(
    'dark',
    shouldUseDark,
  )

}


/* =============================================================
   MOTION PREFERENCE
============================================================= */

export function applyMotionPreference(
  reduceMotion: boolean,
) {

  document.documentElement.classList.toggle(
    'reduce-motion',
    reduceMotion,
  )

}
