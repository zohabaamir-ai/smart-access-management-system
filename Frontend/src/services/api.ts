import { API_BASE_URL } from '../config'

/* =============================================================
   HTTP TRANSPORT

   apiFetch   - authenticated transport. Attaches the bearer
                token and treats a 401 as an expired session
                (clears the token, redirects to /login, throws
                AUTHENTICATION_EXPIRED).

   publicFetch - unauthenticated transport for endpoints that
                run before a session exists (login). No
                Authorization header, no 401 interception, so
                the login screen can read the raw non-2xx body
                (423 locked_until, 401 / 403 message).

   Both share API_BASE_URL from src/config.ts - HTTP origin is
   configured in exactly one place.
============================================================= */

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const token =
    localStorage.getItem(
      'access_token',
    )

  const headers = new Headers(
    options.headers,
  )

  if (token) {
    headers.set(
      'Authorization',
      `Bearer ${token}`,
    )
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    },
  )

  if (response.status === 401) {
    const currentToken =
      localStorage.getItem(
        'access_token',
      )

    if (currentToken) {
      localStorage.removeItem(
        'access_token',
      )

      if (
        window.location.pathname !==
        '/login'
      ) {
        window.location.href =
          '/login'
      }
    }

    throw new Error(
      'AUTHENTICATION_EXPIRED',
    )
  }

  return response
}

export function publicFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(
    `${API_BASE_URL}${endpoint}`,
    options,
  )
}

/* =============================================================
   APPLICATION-LEVEL ERROR + TYPED REQUEST

   ApiError   - thrown when the server responds with a non-2xx
                status. `.message` is `body.detail || fallback`
                (unchanged from what services threw before);
                `.detail` is the raw body.detail (or null) and
                `.status` the HTTP status.

   isAuthExpired - the AUTHENTICATION_EXPIRED sentinel is still
                a plain Error thrown by apiFetch on a 401, so
                request() never sees a 401 response.

   request<T> - the single authenticated JSON contract: parses
                on success, throws ApiError on non-2xx.
============================================================= */

export class ApiError extends Error {
  readonly status: number
  readonly detail: string | null

  constructor(
    status: number,
    detail: string | null,
    fallbackMessage: string,
  ) {
    super(detail || fallbackMessage)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export function isAuthExpired(
  error: unknown,
): boolean {
  return (
    error instanceof Error &&
    error.message ===
      'AUTHENTICATION_EXPIRED'
  )
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackMessage = 'Request failed.',
): Promise<T> {
  const response = await apiFetch(
    endpoint,
    options,
  )

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => null)

    throw new ApiError(
      response.status,
      body?.detail ?? null,
      fallbackMessage,
    )
  }

  return response.json() as Promise<T>
}

export { API_BASE_URL }
