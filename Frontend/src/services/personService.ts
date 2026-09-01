import {
  API_BASE_URL,
  apiFetch,
  request,
} from './api'

/* =============================================================
   PERSON SERVICE

   Every backend call for the Persons domain. Returns parsed,
   typed data and throws ApiError on non-2xx. The domain types
   live here; components/persons/types.ts re-exports them.
============================================================= */

export interface Person {
  id: number
  name: string
  // CNIC. null when the backend has redacted it for this viewer
  // (Operator viewing a record they did not register).
  identifier: string | null
  created_at: string
  photo_path: string | null
  redacted?: boolean
}

export interface PersonActivity {
  id: number
  person_id: number
  person_name: string
  action:
    | 'registered'
    | 'edited'
    | 'deleted'
  performed_by: number
  timestamp: string
}

// POST /persons/enroll returns an enrollment result, not a full
// Person (backend app/schemas/enrollment_schemas.py — the API
// path keeps the "enroll" spelling). The list is refreshed from
// GET /persons after a successful enrollment.
export interface EnrollmentResponse {
  person_id: number
  name: string
  message: string
}

export function getPersons(): Promise<Person[]> {
  return request<Person[]>(
    '/persons',
    {},
    'Failed to load persons.',
  )
}

export function deletePerson(
  personId: number,
): Promise<{ message?: string }> {
  return request<{ message?: string }>(
    `/persons/${personId}`,
    { method: 'DELETE' },
    'Failed to delete person.',
  )
}

export function enrollPerson(
  formData: FormData,
): Promise<EnrollmentResponse> {
  return request<EnrollmentResponse>(
    '/persons/enroll',
    {
      method: 'POST',
      body: formData,
    },
    'Person enrollment failed.',
  )
}

export function updatePerson(
  personId: number,
  formData: FormData,
): Promise<Person> {
  return request<Person>(
    `/persons/${personId}`,
    {
      method: 'PATCH',
      body: formData,
    },
    'Failed to update person.',
  )
}

export function getPersonPhotoUrl(
  personId: number,
  version: number,
): string {
  return `${API_BASE_URL}/persons/${personId}/photo?v=${version}`
}

/* =============================================================
   PERSON PHOTO BLOB

   The person photo endpoint is bearer-authenticated and returns
   an image body (not JSON), so it goes through apiFetch
   directly rather than request<T>. `photoUrl` is the value from
   getPersonPhotoUrl(); the transport, the ok-check and the blob
   read all live here so PersonPhoto never touches the wire.
============================================================= */

export async function fetchPersonPhotoBlob(
  photoUrl: string,
): Promise<Blob> {
  const response = await apiFetch(
    photoUrl.replace(API_BASE_URL, ''),
  )

  if (!response.ok) {
    throw new Error(
      `PHOTO_LOAD_FAILED_${response.status}`,
    )
  }

  return response.blob()
}
