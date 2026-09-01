import { Navigate } from 'react-router-dom'

import ChangePassword from '../../pages/auth/ChangePassword'

/* =============================================================
   PASSWORD CHANGE ROUTE

   Available to authenticated users.

   Temporary-password users are forced through this page.

   Normal authenticated users may also access this page
   voluntarily to change their password.
============================================================= */

function PasswordChangeRoute() {

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


  return <ChangePassword />

}

export default PasswordChangeRoute
