/* =============================================================
   CAMERA RECOGNITION SESSION PRESENCE  (frontend, per-browser)

   The PUBLIC recognition URL (/recognition/camera/:slug), while
   it is open and its camera stream is live, writes a localStorage
   heartbeat. This is the same-browser FALLBACK for the ONLINE
   signal; the authoritative cross-device signal is the backend
   (cameras.last_seen_at). The management "camera preview"
   (/cameras/:id/live) does NOT write a heartbeat — opening a
   preview never makes a camera ONLINE.

   Auto vs Manual recognition mode is NOT here — it is a
   camera-level backend field (cameras.auto_recognition), read
   from GET /cameras/slug/{slug}, so every device that opens the
   camera gets the same mode.
============================================================= */

const SESSION_PREFIX = 'zohab.rec.session.'

// A heartbeat older than this means the public page is gone.
export const SESSION_TTL_MS = 12_000
// How often the public page refreshes its heartbeat.
export const HEARTBEAT_MS = 4_000

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
