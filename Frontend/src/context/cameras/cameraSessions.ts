/* =============================================================
   CAMERA RECOGNITION SESSIONS  (frontend, per-browser)

   Two per-camera concerns, keyed by slug in localStorage:

   1. SESSION PRESENCE
      The PUBLIC recognition URL (/recognition/camera/:slug),
      while it is open and its camera stream is live, writes a
      heartbeat. A camera is ONLINE when its heartbeat is fresh.
      The management "camera preview" (/cameras/:id/live) does
      NOT write a heartbeat — opening a preview never makes a
      camera ONLINE.

   2. AUTO-RECOGNITION CONFIG
      A per-camera on/off flag the management user sets. The
      public recognition URL reads it to decide whether to scan
      continuously or wait for a manual "Recognise".

   LIMITATION: localStorage is per-browser. This gives correct
   behaviour when the management app and the public camera page
   run in the same browser (the realistic single-operator / demo
   setup) and across its tabs. True cross-device presence and
   config would need a backend session/heartbeat subsystem.
============================================================= */

const SESSION_PREFIX = 'zohab.rec.session.'
const AUTO_PREFIX = 'zohab.rec.auto.'

// A heartbeat older than this means the public page is gone.
export const SESSION_TTL_MS = 12_000
// How often the public page refreshes its heartbeat.
export const HEARTBEAT_MS = 4_000

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* private mode / disabled storage — best effort only */
  }
}

function safeRemove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/* ---------- session presence ---------- */

/**
 * Start heartbeating a public recognition session for `slug`.
 * Returns a stop function that clears the heartbeat and removes
 * the key so the camera drops to OFFLINE promptly.
 */
export function startRecognitionSession(
  slug: string,
): () => void {
  const key = SESSION_PREFIX + slug

  const beat = () =>
    safeSet(key, String(Date.now()))

  beat()
  const id = window.setInterval(
    beat,
    HEARTBEAT_MS,
  )

  return () => {
    window.clearInterval(id)
    safeRemove(key)
  }
}

/** Slugs with a fresh public-recognition heartbeat right now. */
export function readActiveSessionSlugs(): Set<string> {
  const active = new Set<string>()

  let store: Storage
  try {
    store = window.localStorage
  } catch {
    return active
  }

  const now = Date.now()
  const stale: string[] = []

  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i)
    if (!key || !key.startsWith(SESSION_PREFIX)) {
      continue
    }

    const raw = store.getItem(key)
    const ts = raw ? Number(raw) : NaN
    const slug = key.slice(SESSION_PREFIX.length)

    if (
      Number.isFinite(ts) &&
      now - ts < SESSION_TTL_MS
    ) {
      active.add(slug)
    } else {
      stale.push(key)
    }
  }

  stale.forEach(safeRemove)
  return active
}

/* ---------- per-camera auto-recognition config ---------- */

export function getAutoRecognition(
  slug: string,
): boolean {
  return safeGet(AUTO_PREFIX + slug) === '1'
}

export function setAutoRecognition(
  slug: string,
  enabled: boolean,
): void {
  safeSet(
    AUTO_PREFIX + slug,
    enabled ? '1' : '0',
  )
}

export function autoRecognitionKey(
  slug: string,
): string {
  return AUTO_PREFIX + slug
}
