import {
  useEffect,
  useRef,
  useState,
} from 'react'

/* =============================================================
   useRecognitionCamera

   The browser camera lifecycle for the recognition screen:
   getUserMedia acquisition, <video> wiring and stream teardown.

   Browser camera failure is a browser-permission / hardware
   concern only. It is deliberately kept separate from the
   backend Camera "disabled" state (handled in
   useRecognitionSession).
============================================================= */

type UseRecognitionCameraOptions = {
  // Start the stream only once the Camera slug has resolved to
  // a usable Camera.
  enabled: boolean
}

function describeCameraError(
  error: unknown,
): string {
  const name =
    error instanceof Error
      ? error.name
      : ''

  if (
    name === 'NotAllowedError' ||
    name === 'SecurityError'
  ) {
    return 'Camera permission was denied. Allow camera access in your browser and try again.'
  }

  if (
    name === 'NotFoundError' ||
    name === 'OverconstrainedError'
  ) {
    return 'No camera was found on this device.'
  }

  if (name === 'NotReadableError') {
    return 'The camera is already in use by another application.'
  }

  return 'Unable to access the camera. Please check your browser settings and try again.'
}

export function useRecognitionCamera({
  enabled,
}: UseRecognitionCameraOptions) {
  const [cameraError, setCameraError] =
    useState('')

  const [ready, setReady] = useState(false)

  const videoRef =
    useRef<HTMLVideoElement>(null)

  const streamRef =
    useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false
    // captured for the cleanup closure — the <video> node is
    // stable for the lifetime of this effect
    const videoEl = videoRef.current

    async function start() {
      setCameraError('')
      setReady(false)

      if (
        !navigator.mediaDevices
          ?.getUserMedia
      ) {
        setCameraError(
          'Camera access is not supported by this browser.',
        )

        return
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            },
          )

        if (cancelled) {
          stream
            .getTracks()
            .forEach((track) =>
              track.stop(),
            )

          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject =
            stream

          const markReady = () => {
            if (!cancelled) {
              setReady(true)
            }
          }

          videoRef.current.onloadeddata =
            markReady

          if (
            videoRef.current.readyState >= 2
          ) {
            markReady()
          }
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        setCameraError(
          describeCameraError(error),
        )
      }
    }

    start()

    return () => {
      cancelled = true
      setReady(false)

      if (videoEl) {
        videoEl.onloadeddata = null
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop(),
          )

        streamRef.current = null
      }
    }
  }, [enabled])

  return {
    videoRef,
    cameraError,
    ready,
  }
}

export default useRecognitionCamera
