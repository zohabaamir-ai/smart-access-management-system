import {
  useEffect,
  useState,
} from 'react'

import type { ChangeEvent } from 'react'

import { isAuthExpired } from '../../services/api'

import {
  getProfile,
  updateProfile,
  type Profile,
} from '../../services/profileService'

/* =============================================================
   useProfileEditor

   The profile editing workflow, moved verbatim out of
   ProfilePanel:

   - loads the profile on mount
   - owns displayName + the selected File + its preview URL
   - image selection with type / size validation
   - object-URL lifecycle + revocation (on re-select, on
     cancel, on save, on unmount)
   - dirty-state detection (name changed / image changed)
   - save via updateProfile, then local state sync +
     onProfileUpdated callback + close

   ProfilePanel keeps the panel rendering + useDismiss.
============================================================= */

type UseProfileEditorOptions = {
  onClose: () => void
  onProfileUpdated?: (profile: Profile) => void
}

export function useProfileEditor({
  onClose,
  onProfileUpdated,
}: UseProfileEditorOptions) {

  const [profile, setProfile] =
    useState<Profile | null>(null)

  const [displayName, setDisplayName] =
    useState('')

  /*
   * The actual File object.
   *
   * This is what gets sent to FastAPI.
   */
  const [selectedImage, setSelectedImage] =
    useState<File | null>(null)

  /*
   * Temporary browser preview URL.
   */
  const [imagePreview, setImagePreview] =
    useState<string | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)

  const [isSaving, setIsSaving] =
    useState(false)

  const [error, setError] =
    useState('')


  /* =============================================================
     LOAD PROFILE
  ============================================================= */

  useEffect(() => {

    async function loadProfile() {

      try {

        setError('')

        const data =
          await getProfile()

        setProfile(data)

        setDisplayName(
          data.display_name,
        )

      } catch (error) {

        if (isAuthExpired(error)) {
          return
        }

        setError(
          error instanceof Error
            ? error.message
            : 'Unable to load profile.',
        )

      } finally {

        setIsLoading(false)

      }
    }

    loadProfile()

  }, [])


  /* =============================================================
     CLEAN UP PREVIEW URL
  ============================================================= */

  useEffect(() => {

    return () => {

      if (imagePreview) {

        URL.revokeObjectURL(
          imagePreview,
        )

      }

    }

  }, [imagePreview])


  /* =============================================================
     PROFILE IMAGE
  ============================================================= */

  function handleImageSelect(
    event: ChangeEvent<HTMLInputElement>,
  ) {

    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }


    /*
     * Frontend validation.
     *
     * Backend validates again.
     */

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {

      setError(
        'Please select a JPEG, PNG, or WebP image.',
      )

      event.target.value = ''

      return

    }


    /*
     * Maximum 5 MB.
     */

    if (
      file.size >
      5 * 1024 * 1024
    ) {

      setError(
        'Profile image must be 5 MB or smaller.',
      )

      event.target.value = ''

      return

    }


    setError('')


    /*
     * Revoke previous preview URL.
     */

    if (imagePreview) {

      URL.revokeObjectURL(
        imagePreview,
      )

    }


    /*
     * Store the actual file.
     */

    setSelectedImage(file)


    /*
     * Create preview.
     */

    const previewUrl =
      URL.createObjectURL(file)

    setImagePreview(
      previewUrl,
    )

  }


  /* =============================================================
     CANCEL
  ============================================================= */

  function handleCancel() {

    if (imagePreview) {

      URL.revokeObjectURL(
        imagePreview,
      )

    }

    setSelectedImage(null)

    setImagePreview(null)


    if (profile) {

      setDisplayName(
        profile.display_name,
      )

    }

    setError('')

    onClose()

  }


  /* =============================================================
     SAVE
  ============================================================= */

  async function handleSave() {

    const trimmedName =
      displayName.trim()


    /*
     * Validate display name.
     */

    if (!trimmedName) {

      setError(
        'Display name is required.',
      )

      return

    }


    if (trimmedName.length > 100) {

      setError(
        'Display name must be 100 characters or less.',
      )

      return

    }


    /*
     * Check whether anything changed.
     */

    const nameChanged =
      !profile ||
      trimmedName !==
        profile.display_name

    const imageChanged =
      selectedImage !== null


    if (
      !nameChanged &&
      !imageChanged
    ) {

      onClose()

      return

    }


    setIsSaving(true)

    setError('')


    try {

      /*
       * Send the new display name (and any selected image)
       * through the profile service. display_name maps 1:1 to
       * the backend display_name field - never to full_name.
       */

      const updatedProfile =
        await updateProfile({
          display_name:
            trimmedName,

          profile_image:
            selectedImage,
        })


      /*
       * Sync local state from the returned backend profile so
       * the new display_name stays visible (do NOT re-seed it
       * from full_name).
       */

      setProfile(
        updatedProfile,
      )

      setDisplayName(
        updatedProfile.display_name,
      )


      /*
       * Notify AppHeader / parent.
       */

      onProfileUpdated?.(
        updatedProfile,
      )


      /*
       * Remove temporary preview.
       */

      if (imagePreview) {

        URL.revokeObjectURL(
          imagePreview,
        )

      }

      setSelectedImage(null)

      setImagePreview(null)


      /*
       * Close ONLY after the backend
       * successfully returns.
       */

      onClose()

    } catch (error) {

      if (isAuthExpired(error)) {
        return
      }


      setError(
        error instanceof Error
          ? error.message
          : 'Unable to update profile.',
      )

    } finally {

      setIsSaving(false)

    }

  }


  return {
    profile,
    displayName,
    setDisplayName,
    imagePreview,
    isLoading,
    isSaving,
    error,
    handleImageSelect,
    handleCancel,
    handleSave,
  }
}

export default useProfileEditor
