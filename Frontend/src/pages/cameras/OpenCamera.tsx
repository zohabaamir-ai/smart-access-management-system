import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  CameraOff,
  ShieldAlert,
} from 'lucide-react'

import Button from '../../components/common/Button'
import Skeleton from '../../components/common/Skeleton'

import {
  ApiError,
  isAuthExpired,
} from '../../services/api'
import {
  getCameraById,
  updateCamera,
  type Camera,
} from '../../services/cameraService'
import { hasPermission } from '../../services/permissions'
import useCameras from '../../context/cameras/useCameras'

import OpenCameraLive from './OpenCameraLive'

/* =============================================================
   CAMERA PREVIEW ROUTE  (/cameras/:cameraId/live)

   Resolves the Camera record (authenticated GET /cameras/{id}),
   then hands off to <CameraPreview> when the camera is usable.
   The preview shows the camera feed only — it does not run
   recognition. Handles loading / not-found / disabled up front.
============================================================= */

type Phase =
  | 'loading'
  | 'ready'
  | 'notfound'
  | 'disabled'
  | 'error'

function OpenCamera() {
  const { cameraId } = useParams()
  const id = Number(cameraId)

  const { reload: reloadCameras } =
    useCameras()

  const [phase, setPhase] =
    useState<Phase>('loading')
  const [camera, setCamera] =
    useState<Camera | null>(null)
  const [message, setMessage] = useState('')
  const [enabling, setEnabling] =
    useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setPhase('notfound')
      return
    }

    setPhase('loading')

    try {
      const data = await getCameraById(id)
      setCamera(data)
      setPhase(
        data.is_active
          ? 'ready'
          : 'disabled',
      )
    } catch (caught) {
      if (isAuthExpired(caught)) {
        return
      }

      if (
        caught instanceof ApiError &&
        caught.status === 404
      ) {
        setPhase('notfound')
        return
      }

      setMessage(
        caught instanceof ApiError
          ? caught.detail ||
              'Unable to load this camera.'
          : 'Unable to connect to the access management server.',
      )
      setPhase('error')
    }
  }, [id])

  useEffect(() => {
    // Intentional on-mount / on-id-change fetch (same pattern as
    // useAsyncData): load() moves the phase machine forward.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  async function handleEnable() {
    if (!camera) {
      return
    }
    setEnabling(true)
    try {
      const updated = await updateCamera(
        camera.id,
        { is_active: true },
      )
      setCamera(updated)
      setPhase('ready')
      void reloadCameras()
    } catch {
      // stay on the disabled screen; the button re-enables
    } finally {
      setEnabling(false)
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="min-h-[42vh] rounded-xl" />
          <Skeleton className="rounded-xl max-lg:hidden" />
        </div>
      </div>
    )
  }

  if (phase === 'ready' && camera) {
    return <OpenCameraLive camera={camera} />
  }

  if (phase === 'disabled' && camera) {
    return (
      <ResolveScreen
        icon={CameraOff}
        title={`${camera.name} is disabled`}
        message="Enable it to preview the feed and use it for public recognition."
      >
        {hasPermission('manage_cameras') && (
          <Button
            loading={enabling}
            onClick={handleEnable}
          >
            Enable camera
          </Button>
        )}
        <Link to="/cameras">
          <Button variant="secondary">
            Back to Cameras
          </Button>
        </Link>
      </ResolveScreen>
    )
  }

  if (phase === 'notfound') {
    return (
      <ResolveScreen
        icon={ShieldAlert}
        title="Camera not found"
        message="This camera doesn't exist or has been decommissioned."
      >
        <Link to="/cameras">
          <Button variant="secondary">
            Back to Cameras
          </Button>
        </Link>
      </ResolveScreen>
    )
  }

  return (
    <ResolveScreen
      icon={CameraOff}
      title="Couldn't open this camera"
      message={message}
    >
      <Button
        variant="secondary"
        onClick={load}
      >
        Try again
      </Button>
      <Link to="/cameras">
        <Button variant="secondary">
          Back to Cameras
        </Button>
      </Link>
    </ResolveScreen>
  )
}

function ResolveScreen({
  icon: Icon,
  title,
  message,
  children,
}: {
  icon: React.ComponentType<{ size?: number }>
  title: string
  message: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Icon size={26} />
        </div>
        <h1 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {message}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {children}
        </div>
      </div>
    </div>
  )
}

export default OpenCamera
