import { Navigate } from 'react-router-dom'

import { mustChangePassword } from '../../services/auth'
import { getStoredStartupPage } from '../../context/appPreferences/storage'

import Login from '../../pages/auth/Login'

/* =============================================================
   LOGIN ROUTE

   Prevents authenticated users from returning to login.

   Users with a pending password change are redirected to
   the required password-change flow.
============================================================= */

function LoginRoute() {

  const token =
    localStorage.getItem(
      'access_token',
    )


  if (token) {

    if (mustChangePassword()) {

      return (
        <Navigate
          to="/change-password"
          replace
        />
      )

    }


    return (
      <Navigate
        to={getStoredStartupPage()}
        replace
      />
    )

  }


  return <Login />

}

export default LoginRoute
