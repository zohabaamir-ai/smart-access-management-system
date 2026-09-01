import { useState } from 'react'

import type { FormEvent } from 'react'

import {
  Camera,
  RefreshCcw,
  Upload,
  X,
} from 'lucide-react'

import {
  ApiError,
  isAuthExpired,
} from '../../services/api'
import {
  enrollPerson,
  updatePerson,
} from '../../services/personService'

import Modal from '../common/Modal'
import Alert from '../common/Alert'
import Button from '../common/Button'
import Field from '../common/Field'
import Input from '../common/Input'
import IconButton from '../common/IconButton'

import PersonPhoto from './PersonPhoto'
import usePhotoCapture from './usePhotoCapture'

import type { Person } from './types'

/* =============================================================
   PERSON FORM MODAL

   Enroll a new person, or edit an existing one. Identity fields
   plus a photo that is either uploaded or captured from the
   webcam. Enrollment-specific failures (no face, multiple faces,
   duplicate face, unreadable image) are turned into plain
   guidance for the operator.
============================================================= */

type PersonFormModalProps = {
  mode: 'add' | 'edit'
  person: Person | null
  getPhotoUrl: (personId: number) => string
  onClose: () => void
  onSaved: (result: {
    message: string
    photoChanged: boolean
  }) => void | Promise<void>
}

function friendlyEnrollmentError(
  raw: string,
): string {
  const text = raw.toLowerCase()

  if (/no face|face not|couldn.?t (detect|find)/.test(text)) {
    return 'No face was found in that photo. Use a clear, front-facing picture with the whole face visible.'
  }
  if (/multiple|more than one/.test(text)) {
    return 'That photo has more than one face. Use a photo of just this person.'
  }
  if (/does not match the enrolled person/.test(text)) {
    return 'This photo does not match the enrolled person. A person’s photo can only be replaced with another photo of the same person.'
  }
  if (/already|duplicate|match(es)? an existing|enrolled/.test(text)) {
    return 'This face looks like it is already enrolled for another person. Check the directory before enrolling again.'
  }
  if (/invalid image|unsupported|corrupt|decode|not an image/.test(text)) {
    return 'That file could not be read as an image. Try a JPEG or PNG.'
  }
  return raw
}

function PersonFormModal({
  mode,
  person,
  getPhotoUrl,
  onClose,
  onSaved,
}: PersonFormModalProps) {
  const isEdit = mode === 'edit'

  const [name, setName] = useState(
    person?.name ?? '',
  )
  const [identifier, setIdentifier] = useState(
    person?.identifier ?? '',
  )
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const {
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
  } = usePhotoCapture(setError)

  function handleClose() {
    if (isSubmitting) return
    stopCamera()
    onClose()
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')

    if (!isEdit && !faceFile) {
      setError(
        'Add a photo — upload one or capture it from the camera.',
      )
      return
    }

    const trimmedName = name.trim()
    const trimmedId = identifier.trim()

    if (isEdit && person) {
      const nameChanged =
        trimmedName !== person.name
      const idChanged =
        trimmedId !== (person.identifier ?? '')
      const photoChanged = faceFile !== null

      if (
        !nameChanged &&
        !idChanged &&
        !photoChanged
      ) {
        setError('Nothing has changed yet.')
        return
      }

      const formData = new FormData()
      if (nameChanged)
        formData.append('name', trimmedName)
      if (idChanged)
        formData.append(
          'identifier',
          trimmedId,
        )
      if (photoChanged && faceFile)
        formData.append('file', faceFile)

      setIsSubmitting(true)
      try {
        const data = await updatePerson(
          person.id,
          formData,
        )
        await onSaved({
          message: `${data.name} updated`,
          photoChanged,
        })
      } catch (caught) {
        if (isAuthExpired(caught)) return
        setError(
          caught instanceof ApiError
            ? friendlyEnrollmentError(
                caught.detail ||
                  'Could not update this person.',
              )
            : 'Unable to connect to the access management server.',
        )
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    const formData = new FormData()
    formData.append('name', trimmedName)
    formData.append('identifier', trimmedId)
    if (faceFile)
      formData.append('file', faceFile)

    setIsSubmitting(true)
    try {
      const data = await enrollPerson(formData)
      await onSaved({
        message: `${data.name} enrolled`,
        photoChanged: true,
      })
    } catch (caught) {
      if (isAuthExpired(caught)) return
      setError(
        caught instanceof ApiError
          ? friendlyEnrollmentError(
              caught.detail ||
                'Enrollment failed.',
            )
          : 'Unable to connect to the access management server.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const modeButton = (
    active: boolean,
  ): string =>
    `flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-400'
        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
    }`

  return (
    <Modal
      size="lg"
      clipOverflow={false}
      panelClassName="max-h-[92vh] overflow-y-auto"
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {isEdit
              ? 'Edit person'
              : 'Enroll person'}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {isEdit
              ? 'Change only what needs to change. A new photo re-runs enrollment.'
              : 'Identity details and one clear, front-facing photo.'}
          </p>
        </div>

        <IconButton
          label="Close"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          <X size={17} />
        </IconButton>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-5 px-5 py-5">
          <Field
            label="Full name"
            htmlFor="person-name"
            required={!isEdit}
          >
            <Input
              id="person-name"
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="e.g. Muhammad Ali"
              required={!isEdit}
              disabled={isSubmitting}
            />
          </Field>

          <Field
            label="CNIC"
            htmlFor="person-id"
            required={!isEdit}
            hint="13 digits, e.g. 35202-4332747-5"
          >
            <Input
              id="person-id"
              type="text"
              value={identifier}
              onChange={(e) =>
                setIdentifier(e.target.value)
              }
              placeholder="35202-4332747-5"
              required={!isEdit}
              disabled={isSubmitting}
            />
          </Field>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Face photo
              </span>
              {isEdit && (
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  Optional — leave as is to keep
                  the current photo
                </span>
              )}
            </div>

            {isEdit && person && (
              <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
                <p className="border-b border-slate-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-500">
                  Current photo
                </p>
                <PersonPhoto
                  personId={person.id}
                  photoUrl={
                    person.photo_path
                      ? getPhotoUrl(person.id)
                      : null
                  }
                  alt={`${person.name} current photo`}
                  className="aspect-video w-full object-contain"
                  fallbackClassName="flex aspect-video w-full items-center justify-center text-xs text-slate-500"
                  iconSize={28}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={setUploadMode}
                disabled={isSubmitting}
                className={modeButton(
                  photoMode === 'upload',
                )}
              >
                <Upload size={15} />
                {isEdit ? 'Replace' : 'Upload'}
              </button>
              <button
                type="button"
                onClick={setCameraMode}
                disabled={isSubmitting}
                className={modeButton(
                  photoMode === 'camera',
                )}
              >
                <Camera size={15} />
                {isEdit
                  ? 'New capture'
                  : 'Capture'}
              </button>
            </div>

            {photoMode === 'upload' &&
              (previewUrl ? (
                <div className="mt-3 space-y-2">
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
                    <img
                      src={previewUrl}
                      alt="Selected face"
                      className="aspect-video w-full object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={clearSelectedPhoto}
                    disabled={isSubmitting}
                  >
                    Choose a different photo
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="person-face"
                  className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/5"
                >
                  <Upload
                    size={22}
                    className="text-slate-500"
                  />
                  <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {isEdit
                      ? 'Choose a replacement photo'
                      : 'Choose a face photo'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    One person, facing the
                    camera, well lit.
                  </p>
                  <input
                    id="person-face"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="hidden"
                  />
                </label>
              ))}

            {photoMode === 'camera' && (
              <div className="mt-3 space-y-2">
                {isCameraOpen ? (
                  <>
                    <div className="relative overflow-hidden rounded-lg bg-slate-950">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="aspect-video w-full object-cover"
                      />
                      <span className="pointer-events-none absolute inset-6 rounded-lg border border-scan/70" />
                    </div>
                    <Button
                      type="button"
                      icon={
                        <Camera size={15} />
                      }
                      fullWidth
                      onClick={capturePhoto}
                      disabled={isCameraLoading}
                    >
                      {isCameraLoading
                        ? 'Starting camera…'
                        : 'Capture photo'}
                    </Button>
                  </>
                ) : previewUrl ? (
                  <>
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
                      <img
                        src={previewUrl}
                        alt="Captured face"
                        className="aspect-video w-full object-contain"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      fullWidth
                      icon={
                        <RefreshCcw
                          size={14}
                        />
                      }
                      onClick={retakePhoto}
                      disabled={isSubmitting}
                    >
                      Retake photo
                    </Button>
                  </>
                ) : null}
              </div>
            )}
          </div>

          <canvas
            ref={canvasRef}
            className="hidden"
          />

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={
              isSubmitting ||
              (!isEdit && !faceFile)
            }
          >
            {isEdit
              ? 'Save changes'
              : 'Enroll person'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default PersonFormModal
