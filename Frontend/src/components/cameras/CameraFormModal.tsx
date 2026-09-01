import { useState } from 'react'

import type { FormEvent } from 'react'

import { X } from 'lucide-react'

import {
  ApiError,
  isAuthExpired,
} from '../../services/api'
import {
  createCamera,
  updateCamera,
} from '../../services/cameraService'

import Modal from '../common/Modal'
import Alert from '../common/Alert'

import type { Camera } from './types'

/* =============================================================
   CAMERA FORM MODAL

   Register / edit a camera. The management user supplies name
   and location only; the slug is generated and owned by the
   backend. Edit sends just the fields that changed.
============================================================= */

type CameraFormModalProps = {
  mode: 'add' | 'edit'
  camera: Camera | null
  onClose: () => void
  onSaved: (result: {
    message: string
  }) => void | Promise<void>
}

function CameraFormModal({
  mode,
  camera,
  onClose,
  onSaved,
}: CameraFormModalProps) {
  const isEdit = mode === 'edit'

  const [name, setName] = useState(
    camera?.name ?? '',
  )

  const [location, setLocation] = useState(
    camera?.location ?? '',
  )

  const [error, setError] = useState('')

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  function handleClose() {
    if (isSubmitting) {
      return
    }

    onClose()
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')

    const trimmedName = name.trim()
    const trimmedLocation = location.trim()

    if (!trimmedName || !trimmedLocation) {
      setError(
        'Name and location are both required.',
      )

      return
    }

    setIsSubmitting(true)

    try {
      if (isEdit && camera) {
        const nameChanged =
          trimmedName !== camera.name

        const locationChanged =
          trimmedLocation !==
          camera.location

        if (
          !nameChanged &&
          !locationChanged
        ) {
          setError(
            'No changes were provided.',
          )

          setIsSubmitting(false)

          return
        }

        const data = await updateCamera(
          camera.id,
          {
            ...(nameChanged
              ? { name: trimmedName }
              : {}),
            ...(locationChanged
              ? {
                  location:
                    trimmedLocation,
                }
              : {}),
          },
        )

        await onSaved({
          message: `${data.name} was updated successfully.`,
        })
      } else {
        const data = await createCamera({
          name: trimmedName,
          location: trimmedLocation,
        })

        await onSaved({
          message: `${data.name} was registered successfully.`,
        })
      }
    } catch (submitError) {
      if (isAuthExpired(submitError)) {
        return
      }

      setError(
        submitError instanceof ApiError
          ? submitError.detail ||
              (isEdit
                ? 'Unable to update camera.'
                : 'Unable to create camera.')
          : 'Unable to connect to the access management server.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      size="md"
      clipOverflow={false}
      panelClassName="max-h-[92vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEdit
              ? 'Edit Camera'
              : 'Register Camera'}
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isEdit
              ? 'Update only the information that needs to change.'
              : 'Add a recognition camera by name and location.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X size={19} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-5 px-6 py-5">
          {/* NAME */}

          <div>
            <label
              htmlFor="camera-name"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Name
            </label>

            <input
              id="camera-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. Main Entrance"
              required
              disabled={isSubmitting}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {/* LOCATION */}

          <div>
            <label
              htmlFor="camera-location"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Location
            </label>

            <input
              id="camera-location"
              type="text"
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value,
                )
              }
              placeholder="e.g. Building A - Ground Floor"
              required
              disabled={isSubmitting}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {/* SLUG */}

          {isEdit && camera ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Slug
              </label>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <code className="text-xs text-slate-600 dark:text-slate-300">
                  {camera.slug}
                </code>
              </div>

              <p className="mt-1.5 text-xs text-slate-500">
                Managed by the system and used by the dedicated recognition URL.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              A URL slug is generated automatically from the name.
            </p>
          )}

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}
        </div>

        {/* Footer */}

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {isSubmitting
              ? isEdit
                ? 'Saving...'
                : 'Registering...'
              : isEdit
                ? 'Save Changes'
                : 'Register Camera'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CameraFormModal
