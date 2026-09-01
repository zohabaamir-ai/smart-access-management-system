import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Eye,
  MapPin,
  VideoOff,
} from 'lucide-react'

import Button from '../../components/common/Button'
import { StatusDot } from '../../components/common/StatusDot'
import SectionLabel from '../../components/common/SectionLabel'
import useToast from '../../components/common/toast/useToast'

import useCameras from '../../context/cameras/useCameras'
import type { Camera } from '../../services/cameraService'

import useRecognitionCamera from '../../components/recognition/useRecognitionCamera'
import CameraFrame from '../../components/camera/CameraFrame'
import {
  getCameraSessionStatus,
  getCameraStatusMeta,
} from '../../components/cameras/cameraStatus'
import {
  formatDate,
  publicRecognitionUrl,
} from '../../components/cameras/cameraFormat'

/* =============================================================
   CAMERA PREVIEW  (management, route /cameras/:id/live)

   Shows the management user what a camera is seeing. That is
   all it does:

     · it renders the camera's live video
     · it does NOT run face recognition
     · it creates NO Recognition Events and NO Activity records
     · opening it does NOT make the camera ONLINE

   Recognition happens on the PUBLIC recognition URL. The
   camera's ONLINE / OFFLINE status shown here reflects that
   public session, not this preview.
============================================================= */

type Props = {
  camera: Camera
}

function CameraPreview({ camera }: Props) {
  const navigate = useNavigate()
  const toast = useToast()
  const { activeSessionSlugs } = useCameras()

  const { videoRef, cameraError, ready } =
    useRecognitionCamera({ enabled: true })

  const autoConfigured =
    camera.auto_recognition

  const status = getCameraSessionStatus(
    camera,
    activeSessionSlugs,
  )
  const meta = getCameraStatusMeta(status)
  const publicUrl = publicRecognitionUrl(
    camera.slug,
  )

  if (cameraError) {
    return (
      <PreviewMessage
        title="Camera access needed"
        message={cameraError}
        cameraName={camera.name}
        retry={() =>
          window.location.reload()
        }
      />
    )
  }

  function copyPublicUrl() {
    navigator.clipboard
      ?.writeText(publicUrl)
      .then(
        () =>
          toast.show({
            message:
              'Public recognition URL copied',
          }),
        () =>
          toast.show({
            tone: 'fault',
            message: publicUrl,
          }),
      )
  }

  return (
    <div className="flex h-full flex-col">
      {/* context bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => navigate('/cameras')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Cameras
        </button>

        <span className="text-slate-300 dark:text-slate-700">
          /
        </span>

        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          {camera.name}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Eye size={13} />
          Camera preview
        </span>

        <StatusDot
          tone={meta.tone}
          label={meta.label}
          pulse={status === 'online'}
          className="ml-auto"
        />
      </div>

      {/* body */}
      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-h-[42vh]">
          <CameraFrame
            videoRef={videoRef}
            tone="idle"
            bare
            notReady={!ready}
            notReadyLabel="Connecting to camera…"
            ribbon={
              <span className="inline-flex items-center gap-1.5">
                <Eye size={12} />
                Preview — not recognizing
              </span>
            }
          />
        </div>

        {/* rail */}
        <div className="min-h-0 space-y-5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 max-lg:hidden dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {camera.name}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <MapPin size={14} />
              {camera.location}
            </p>
            <p className="tnum mt-1 text-xs text-slate-500 dark:text-slate-500">
              Added {formatDate(camera.created_at)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
            This preview shows the camera feed
            only. Recognition runs on the public
            recognition URL, not here.
          </div>

          <div>
            <SectionLabel>Session</SectionLabel>
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">
                  Recognition session
                </dt>
                <dd className="font-medium text-slate-900 dark:text-white">
                  {status === 'online'
                    ? 'Active'
                    : 'None'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">
                  Auto recognition
                </dt>
                <dd className="font-medium text-slate-900 dark:text-white">
                  {autoConfigured
                    ? 'On'
                    : 'Off'}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              Change Auto recognition from the
              camera&apos;s details.
            </p>
          </div>

          <div>
            <SectionLabel>
              Public recognition URL
            </SectionLabel>
            <p className="mt-2 break-all font-mono text-xs text-slate-500 dark:text-slate-400">
              {publicUrl}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Copy size={14} />}
                onClick={copyPublicUrl}
              >
                Copy
              </Button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  icon={
                    <ExternalLink size={14} />
                  }
                >
                  Open
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewMessage({
  title,
  message,
  cameraName,
  retry,
}: {
  title: string
  message: string
  cameraName: string
  retry?: () => void
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <VideoOff size={26} />
        </div>
        <h1 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {message}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
          {cameraName}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          {retry && (
            <Button
              variant="secondary"
              onClick={retry}
            >
              Try again
            </Button>
          )}
          <Link to="/cameras">
            <Button variant="secondary">
              Back to Cameras
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CameraPreview
