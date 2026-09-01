import { publicFetch } from './api'

/* =============================================================
   RECOGNITION SERVICE

   Recognition happens on ONE surface: the PUBLIC recognition
   camera page (/recognition/camera/:slug).

     GET  /cameras/slug/{slug}         resolve the Camera
     POST /recognition/camera/{slug}   recognize a frame

   No session, identified by slug alone. Uses publicFetch. On a
   successful match the backend creates exactly one Recognition
   Event (app/services/recognition_service.py).

   The authenticated management app does NOT recognize — its
   camera page (/cameras/:id/live) is a video preview only.
============================================================= */

// Public projection of a Camera, from GET /cameras/slug/{slug}
// (mirrors app/schemas/camera_schemas.py :: CameraResponse).
export interface RecognitionCamera {
  id: number
  name: string
  slug: string
  location: string
  is_active: boolean
  status: 'online' | 'offline' | 'disabled'
  created_at: string
}

// One recognition outcome, from POST /recognition/camera/{slug}
// (mirrors app/schemas/recognition_schemas.py :: RecognitionResult).
export interface RecognitionResult {
  person_id: number | null
  name: string | null
  distance: number
  matched: boolean
  timestamp: string | null
}

export interface RecognitionResponse {
  results: RecognitionResult[]
}

// Thrown for a non-2xx response so the caller can branch on the
// HTTP status (404 unknown/disabled camera, 400 multi-face /
// bad image, 422 malformed, 5xx) while still showing the
// backend's own detail message.
export class RecognitionError extends Error {
  readonly status: number

  constructor(
    status: number,
    detail: string | null,
    fallback: string,
  ) {
    super(detail || fallback)
    this.name = 'RecognitionError'
    this.status = status
  }
}

async function readDetail(
  response: Response,
): Promise<string | null> {
  const body = await response
    .json()
    .catch(() => null)

  const detail = body?.detail

  return typeof detail === 'string'
    ? detail
    : null
}

/* =============================================================
   RESOLVE CAMERA BY SLUG

   404 covers three distinct backend states, told apart by the
   detail text: "Camera not found." / "This camera is currently
   disabled." / "This camera has been decommissioned."
============================================================= */

export async function getRecognitionCamera(
  slug: string,
): Promise<RecognitionCamera> {
  const response = await publicFetch(
    `/cameras/slug/${encodeURIComponent(slug)}`,
  )

  if (!response.ok) {
    throw new RecognitionError(
      response.status,
      await readDetail(response),
      'Unable to load this camera.',
    )
  }

  return response.json() as Promise<RecognitionCamera>
}

/* =============================================================
   RECOGNIZE A CAPTURED FRAME

   POST /recognition/camera/{slug}, multipart, single "file"
   field. The slug is the only Camera identifier.
============================================================= */

export async function recognizeAtCamera(
  slug: string,
  frame: Blob,
): Promise<RecognitionResponse> {
  // multipart/form-data with a single "file" field — the only
  // thing the endpoint accepts. The Camera is taken from the
  // slug in the URL; nothing else is sent.
  const formData = new FormData()

  formData.append(
    'file',
    frame,
    'frame.jpg',
  )

  const response = await publicFetch(
    `/recognition/camera/${encodeURIComponent(slug)}`,
    {
      method: 'POST',
      body: formData,
    },
  )

  if (!response.ok) {
    throw new RecognitionError(
      response.status,
      await readDetail(response),
      'Face recognition failed.',
    )
  }

  return response.json() as Promise<RecognitionResponse>
}

/* =============================================================
   SESSION HEARTBEAT

   POST /recognition/camera/{slug}/heartbeat — no body, no
   recognition, no event. Tells the backend this public station
   is live so the management app (any device) shows the camera
   ONLINE. Best-effort: a failed beat is swallowed (the loop
   retries on its interval); a 404 means the camera is gone.
============================================================= */

export async function sendCameraHeartbeat(
  slug: string,
): Promise<void> {
  const response = await publicFetch(
    `/recognition/camera/${encodeURIComponent(slug)}/heartbeat`,
    { method: 'POST' },
  )

  if (!response.ok) {
    throw new RecognitionError(
      response.status,
      await readDetail(response),
      'Session heartbeat failed.',
    )
  }
}
