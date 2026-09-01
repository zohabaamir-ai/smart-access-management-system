import { useState } from 'react'

import { useParams } from 'react-router-dom'

import { LoaderCircle } from 'lucide-react'

import SystemLogo from '../../components/branding/SystemLogo'

import useRecognitionSession from '../../components/recognition/useRecognitionSession'
import useRecognitionCamera from '../../components/recognition/useRecognitionCamera'
import usePublicRecognition from '../../components/recognition/usePublicRecognition'

import RecognitionStatusScreen from '../../components/recognition/RecognitionStatusScreen'
import RecognitionHeader from '../../components/recognition/RecognitionHeader'
import RecognitionPanel from '../../components/recognition/RecognitionPanel'
import RecognitionSidebar from '../../components/recognition/RecognitionSidebar'

/* =============================================================
   CAMERA RECOGNITION  (public, /recognition/camera/:slug)

   The real recognition station. Public and unauthenticated —
   the Camera is identified by the URL slug alone. It accesses
   the camera, recognizes faces, shows the result, and (on a
   match) the backend logs the Recognition Event. Its per-camera
   Auto recognition setting decides continuous vs manual
   scanning. Opening this page establishes the camera's ONLINE
   session.
============================================================= */

function CameraRecognition() {
  const { slug = '' } = useParams()

  const {
    camera,
    loading,
    error,
    unavailableKind,
    reload,
  } = useRecognitionSession(slug)

  const { videoRef, cameraError, ready } =
    useRecognitionCamera({
      enabled: !loading && camera !== null,
    })

  const [unavailableMsg, setUnavailableMsg] =
    useState('')

  const {
    phase,
    outcome,
    auto,
    canvasRef,
    sigCanvasRef,
    recognizeNow,
    dismissResult,
  } = usePublicRecognition({
    slug,
    videoRef,
    ready: ready && !cameraError,
    onUnavailable: (message) =>
      setUnavailableMsg(message),
  })

  /* ---------- loading ---------- */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-5">
          <SystemLogo
            variant="full"
            size="lg"
            light
          />
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
            Loading camera…
          </div>
        </div>
      </div>
    )
  }

  /* ---------- camera not resolvable ---------- */

  if (unavailableKind === 'notfound') {
    return (
      <RecognitionStatusScreen
        title="Camera not found"
        message={
          error ||
          'No camera matches this address.'
        }
        footnote={`/recognition/camera/${slug}`}
        actionLabel="Retry"
        onAction={reload}
      />
    )
  }

  if (unavailableKind === 'unavailable') {
    return (
      <RecognitionStatusScreen
        title="Camera unavailable"
        message={
          error ||
          'This camera is not accepting recognitions right now.'
        }
        actionLabel="Try again"
        onAction={reload}
      />
    )
  }

  if (error || !camera) {
    return (
      <RecognitionStatusScreen
        title="Something went wrong"
        message={
          error ||
          'Unable to load this camera.'
        }
        actionLabel="Retry"
        onAction={reload}
      />
    )
  }

  /* ---------- camera disabled mid-session ---------- */

  if (unavailableMsg) {
    return (
      <RecognitionStatusScreen
        title="Camera unavailable"
        message={unavailableMsg}
        actionLabel="Try again"
        onAction={() => {
          setUnavailableMsg('')
          reload()
        }}
      />
    )
  }

  /* ---------- running ---------- */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:h-screen lg:overflow-hidden dark:bg-slate-950 dark:text-white">
      <RecognitionHeader camera={camera} />

      {/* Below `lg` the camera + the identity/instructions panel
          stack in one column and can exceed the viewport height —
          this page scrolls there instead of clipping the panel.
          At `lg` and up it is the original fixed, non-scrolling
          two-column kiosk layout. */}
      <main className="mx-auto max-w-7xl overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:h-[calc(100vh-5rem)] lg:overflow-hidden">
        <div className="grid gap-4 sm:gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[1.5fr_0.5fr]">
          <RecognitionPanel
            phase={phase}
            outcome={outcome}
            auto={auto}
            ready={ready && !cameraError}
            cameraError={cameraError}
            videoRef={videoRef}
            canvasRef={canvasRef}
            sigCanvasRef={sigCanvasRef}
            onRecognize={recognizeNow}
            onDismiss={dismissResult}
          />

          <RecognitionSidebar
            camera={camera}
            auto={auto}
          />
        </div>
      </main>
    </div>
  )
}

export default CameraRecognition
