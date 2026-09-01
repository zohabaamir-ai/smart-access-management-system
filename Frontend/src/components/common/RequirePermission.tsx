import type { ReactNode } from 'react'

import {
  hasPermission,
  type Permission,
} from '../../services/permissions'

import NotAuthorized, {
  NOT_AUTHORIZED_PAGE_MESSAGE,
} from './NotAuthorized'

/* =============================================================
   REQUIRE PERMISSION

   Route/section guard. Renders its children only when the
   current user's role holds `permission` (per PERMISSIONS.md);
   otherwise shows the shared NotAuthorized surface.
============================================================= */

type RequirePermissionProps = {
  permission: Permission
  children: ReactNode
  message?: string
}

function RequirePermission({
  permission,
  children,
  message = NOT_AUTHORIZED_PAGE_MESSAGE,
}: RequirePermissionProps) {
  if (!hasPermission(permission)) {
    return (
      <NotAuthorized message={message} />
    )
  }

  return <>{children}</>
}

export default RequirePermission
