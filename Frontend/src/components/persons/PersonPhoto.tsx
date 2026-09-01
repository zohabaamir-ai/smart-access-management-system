import {
  useEffect,
  useState,
} from 'react'

import { UserRound } from 'lucide-react'

import { isAuthExpired } from '../../services/api'
import { fetchPersonPhotoBlob } from '../../services/personService'

/* =============================================================
   PERSON PHOTO

   Auth-aware avatar: fetches the protected photo endpoint as a
   blob and renders it, with loading and fallback states.
   Moved verbatim from pages/persons/Persons.tsx.
============================================================= */

interface PersonPhotoProps {
  personId: number
  photoUrl: string | null
  alt?: string
  className: string
  fallbackClassName: string
  iconSize: number
}

function PersonPhoto({
  personId,
  photoUrl,
  alt = '',
  className,
  fallbackClassName,
  iconSize,
}: PersonPhotoProps) {
  const [imageUrl, setImageUrl] =
    useState<string | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)

  const [hasError, setHasError] =
    useState(false)

  useEffect(() => {
    let isMounted = true
    let objectUrl: string | null = null

    async function loadPhoto() {
      if (!photoUrl) {
        if (isMounted) {
          setImageUrl(null)
          setIsLoading(false)
          setHasError(false)
        }

        return
      }

      setIsLoading(true)
      setHasError(false)
      setImageUrl(null)

      try {
        const blob =
          await fetchPersonPhotoBlob(
            photoUrl,
          )

        objectUrl =
          URL.createObjectURL(blob)

        if (isMounted) {
          setImageUrl(objectUrl)
          setHasError(false)
        }
      } catch (error) {
        if (isAuthExpired(error)) {
          return
        }

        if (isMounted) {
          setImageUrl(null)
          setHasError(true)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadPhoto()

    return () => {
      isMounted = false

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [photoUrl, personId])

  if (isLoading) {
    return (
      <div
        className={`${fallbackClassName} skeleton`}
        aria-label="Loading photo"
      />
    )
  }

  if (hasError || !imageUrl) {
    return (
      <div className={fallbackClassName}>
        <UserRound
          size={iconSize}
          className="text-slate-500"
        />
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={() => {
        setHasError(true)
        setImageUrl(null)
      }}
    />
  )
}

export default PersonPhoto
