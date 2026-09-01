import {
  useEffect,
  useRef,
  useState,
} from 'react'

import type { ChangeEvent } from 'react'

import type { PhotoMode } from './types'

/* =============================================================
   usePhotoCapture

   Upload-or-webcam photo selection for the person form.
   Extracted verbatim from pages/persons/Persons.tsx so the
   camera plumbing lives in one place.
============================================================= */

export function usePhotoCapture(
  setError: (message: string) => void,
) {
  const [photoMode, setPhotoMode] =
    useState<PhotoMode>('upload')

  const [isCameraOpen, setIsCameraOpen] =
    useState(false)

  const [
    isCameraLoading,
    setIsCameraLoading,
  ] = useState(false)

  const [faceFile, setFaceFile] =
    useState<File | null>(null)

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null)

  const videoRef =
    useRef<HTMLVideoElement | null>(null)

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null)

  const streamRef =
    useRef<MediaStream | null>(null)

  const previewUrlRef =
    useRef<string | null>(null)

  useEffect(() => {
    previewUrlRef.current = previewUrl
  }, [previewUrl])


  function clearSelectedPhoto() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setFaceFile(null)
    setPreviewUrl(null)
  }


  function stopCamera() {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop())

      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsCameraOpen(false)
  }


  async function startCamera() {
    setError('')

    setIsCameraOpen(true)
    setIsCameraLoading(true)

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: 'user',
            },
            audio: false,
          },
        )

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        await videoRef.current.play()
      }
    } catch {
      setIsCameraOpen(false)

      setError(
        'Unable to access the camera. Please allow camera permission or use photo upload.',
      )
    } finally {
      setIsCameraLoading(false)
    }
  }


  function setUploadMode() {
    stopCamera()
    clearSelectedPhoto()

    setPhotoMode('upload')
    setError('')
  }


  function setCameraMode() {
    stopCamera()
    clearSelectedPhoto()

    setPhotoMode('camera')
    setError('')

    startCamera()
  }


  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] ?? null

    if (!file) {
      return
    }

    stopCamera()

    setPhotoMode('upload')
    setFaceFile(file)
    setError('')

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setPreviewUrl(
      URL.createObjectURL(file),
    )

    event.target.value = ''
  }


  function capturePhoto() {
    const video = videoRef.current

    const canvas = canvasRef.current

    if (!video || !canvas) {
      return
    }

    const width = video.videoWidth

    const height = video.videoHeight

    if (!width || !height) {
      setError('Camera is not ready yet.')

      return
    }

    canvas.width = width
    canvas.height = height

    const context =
      canvas.getContext('2d')

    if (!context) {
      setError(
        'Unable to capture the photo.',
      )

      return
    }

    context.drawImage(
      video,
      0,
      0,
      width,
      height,
    )

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError(
            'Unable to create the captured image.',
          )

          return
        }

        const file = new File(
          [blob],
          'person-camera-capture.jpg',
          {
            type: 'image/jpeg',
          },
        )

        setFaceFile(file)

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }

        setPreviewUrl(
          URL.createObjectURL(file),
        )

        stopCamera()
      },
      'image/jpeg',
      0.9,
    )
  }


  function retakePhoto() {
    stopCamera()
    clearSelectedPhoto()

    setPhotoMode('camera')
    setError('')

    startCamera()
  }


  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop(),
          )

        streamRef.current = null
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(
          previewUrlRef.current,
        )
      }
    }
  }, [])


  return {
    photoMode,
    isCameraOpen,
    isCameraLoading,
    faceFile,
    previewUrl,
    videoRef,
    canvasRef,
    clearSelectedPhoto,
    stopCamera,
    setUploadMode,
    setCameraMode,
    handleFileChange,
    capturePhoto,
    retakePhoto,
  }
}

export default usePhotoCapture
