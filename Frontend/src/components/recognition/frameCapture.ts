/* =============================================================
   FRAME CAPTURE

   Shared <video> -> <canvas> -> JPEG blob capture used by both
   recognition surfaces (public kiosk + Open Camera).
============================================================= */

export async function captureJpegFrame(
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement | null,
): Promise<Blob> {
  if (!video || !canvas) {
    throw new Error(
      'The camera is not ready yet.',
    )
  }

  if (
    !video.videoWidth ||
    !video.videoHeight
  ) {
    throw new Error(
      'The camera is still starting.',
    )
  }

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error(
      'Unable to process the camera image.',
    )
  }

  context.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  const blob = await new Promise<Blob | null>(
    (resolve) =>
      canvas.toBlob(
        resolve,
        'image/jpeg',
        0.9,
      ),
  )

  if (!blob) {
    throw new Error(
      'Unable to capture an image from the camera.',
    )
  }

  return blob
}

/* =============================================================
   FRAME SIGNATURE  (coarse scene fingerprint)

   A 32x24 greyscale downscale of the current video frame. The
   public recognition station compares it against a quiet
   "baseline" to decide, cheaply and locally, when the scene has
   changed enough to be worth a real recognition request — a
   lightweight watch, not a poll — and, after a match, when the
   recognised person has most likely left the frame.

   This is a pixel-delta heuristic, NOT face detection or
   recognition: it only gates *when* to run the existing
   recognition call, never the result.
============================================================= */

const SIG_W = 32
const SIG_H = 24

export function frameSignature(
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement | null,
): Uint8Array | null {
  if (
    !video ||
    !canvas ||
    !video.videoWidth ||
    !video.videoHeight
  ) {
    return null
  }

  canvas.width = SIG_W
  canvas.height = SIG_H

  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!context) {
    return null
  }

  context.drawImage(
    video,
    0,
    0,
    SIG_W,
    SIG_H,
  )

  const { data } = context.getImageData(
    0,
    0,
    SIG_W,
    SIG_H,
  )

  const out = new Uint8Array(SIG_W * SIG_H)

  for (let i = 0; i < out.length; i++) {
    const p = i * 4
    // Rec. 601 luma
    out[i] =
      (data[p] * 0.299 +
        data[p + 1] * 0.587 +
        data[p + 2] * 0.114) |
      0
  }

  return out
}

// Normalised mean absolute difference, 0 (identical) .. 1.
export function frameDelta(
  a: Uint8Array | null,
  b: Uint8Array | null,
): number {
  if (
    !a ||
    !b ||
    a.length !== b.length ||
    a.length === 0
  ) {
    return 1
  }

  let sum = 0

  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i])
  }

  return sum / (a.length * 255)
}
