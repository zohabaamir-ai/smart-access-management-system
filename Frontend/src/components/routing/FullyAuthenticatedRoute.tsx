import { Navigate } from 'react-router-dom'

import { mustChangePassword } from '../../services/auth'

/* =============================================================
   FULLY AUTHENTICATED ROUTE

   Used only by the management application.

   User must:

   1. Have an access token
   2. Have completed the required password change
============================================================= */

function FullyAuthenticatedRoute({
  children,
}: {
  children: React.ReactNode
}) {

  const token =
    localStorage.getItem(
      'access_token',
    )


  if (!token) {

    return (
      <Navigate
        to="/login"
        replace
      />
    )

  }


  if (mustChangePassword()) {

    return (
      <Navigate
        to="/change-password"
        replace
      />
    )

  }


  return children

}

export default FullyAuthenticatedRoute
