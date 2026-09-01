import {
  publicFetch,
  request,
} from './api'

/* =============================================================
   AUTH SERVICE

   HTTP calls for authentication flows. Token decoding and
   storage helpers stay in services/auth.ts.

   login runs before a session exists and must expose the raw
   non-2xx body (the login screen reads the 423 locked_until
   and the 401 / 403 message from it), so it returns
   Promise<Response> and uses publicFetch. changePassword is
   authenticated and uses the standard typed request().
============================================================= */

export interface ChangePasswordResponse {
  message: string
  access_token: string
  token_type: string
}

export function login(payload: {
  username: string
  password: string
}): Promise<Response> {
  return publicFetch('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type':
        'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export function changePassword(payload: {
  current_password: string
  new_password: string
  confirm_password: string
}): Promise<ChangePasswordResponse> {
  return request<ChangePasswordResponse>(
    '/auth/change-password',
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify(payload),
    },
    'Unable to change password.',
  )
}
