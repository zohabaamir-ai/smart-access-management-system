import { jwtDecode } from 'jwt-decode'

export interface AccessTokenPayload {
  sub: string
  username: string
  role: string
  must_change_password: boolean
  // B6 per-admin token version. The backend is the sole authority for
  // token validity (a stale version is rejected server-side with 401,
  // which api.ts already handles). Decoded here only so the payload
  // type matches the finalized JWT contract; no client-side
  // invalidation logic is derived from it.
  token_version: number
  exp: number
}

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

export function getTokenPayload(): AccessTokenPayload | null {
  const token = getAccessToken()

  if (!token) {
    return null
  }

  try {
    return jwtDecode<AccessTokenPayload>(token)
  } catch {
    return null
  }
}

export function getCurrentUsername(): string | null {
  const payload = getTokenPayload()

  return payload?.username ?? null
}

export function mustChangePassword(): boolean {
  const payload = getTokenPayload()

  return payload?.must_change_password === true
}

export function logout() {
  localStorage.removeItem('access_token')

  window.location.href = '/login'
}