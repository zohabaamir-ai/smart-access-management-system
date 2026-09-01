import {
  apiFetch,
  ApiError,
  API_BASE_URL,
} from './api'


/* =============================================================
   TYPES
============================================================= */

/*
 * Finalized backend contract (GET /auth/profile -> ProfileResponse):
 *
 *   full_name   - original / registered identity. Read-only from the
 *                 self-service profile; corrected by SA/Admin via Users.
 *   display_name - the name shown in the application UI. Editable here.
 *   username     - the account identifier. Not editable here.
 *   role         - authoritative in the DB. Read-only here.
 *   profile_image_url - management-account photo (distinct from a
 *                 Person enrollment photo).
 *
 * These are separate concepts; display_name is never an alias for
 * full_name.
 */

export interface Profile {
  id: number
  full_name: string
  display_name: string
  username: string
  role: string
  profile_image_url: string | null
}


export interface UpdateProfileRequest {
  display_name: string
  profile_image?: File | null
}


/* =============================================================
   PROFILE IMAGE URL
============================================================= */

export function getProfileImageUrl(
  imageUrl: string | null,
): string | null {

  if (!imageUrl) {
    return null
  }

  /*
   * Already an absolute URL.
   */

  if (
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://')
  ) {
    return imageUrl
  }

  /*
   * Backend returns paths such as:
   *
   * /uploads/profiles/example.jpg
   *
   * Convert them into:
   *
   * http://127.0.0.1:8000/uploads/...
   */

  return `${API_BASE_URL}${imageUrl}`
}


/* =============================================================
   NORMALIZE PROFILE
============================================================= */

function normalizeProfile(
  profile: Profile,
): Profile {

  return {
    ...profile,

    profile_image_url:
      getProfileImageUrl(
        profile.profile_image_url,
      ),
  }

}


/* =============================================================
   GET PROFILE
============================================================= */

export async function getProfile(): Promise<Profile> {

  const response =
    await apiFetch(
      '/auth/profile',
    )


  if (!response.ok) {

    const data =
      await response
        .json()
        .catch(() => null)

    throw new ApiError(
      response.status,
      data?.detail ?? null,
      'Unable to load profile.',
    )

  }


  const data =
    (await response.json()) as Profile


  return normalizeProfile(
    data,
  )

}


/* =============================================================
   UPDATE PROFILE
============================================================= */

export async function updateProfile(
  request: UpdateProfileRequest,
): Promise<Profile> {

  const formData =
    new FormData()


  formData.append(
    'display_name',
    request.display_name,
  )


  if (
    request.profile_image
  ) {

    formData.append(
      'profile_image',
      request.profile_image,
    )

  }


  const response =
    await apiFetch(
      '/auth/profile',
      {
        method: 'PATCH',
        body: formData,
      },
    )


  if (!response.ok) {

    const data =
      await response
        .json()
        .catch(() => null)

    throw new ApiError(
      response.status,
      data?.detail ?? null,
      'Unable to update profile.',
    )

  }


  const data =
    (await response.json()) as Profile


  return normalizeProfile(
    data,
  )

}