import jwt
from fastapi import Depends, HTTPException
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy.orm import Session

from app.core.config import (
    JWT_ALGORITHM as ALGORITHM,
    JWT_SECRET_KEY as SECRET_KEY,
)
from app.core.permissions import (
    Permission,
    has_permission,
)
from app.db.database import get_db
from app.db.db_models.admin import Admin


security = HTTPBearer(auto_error=False)

_PASSWORD_CHANGE_REQUIRED_DETAIL = (
    "Password change required "
    "before accessing the system."
)


def get_authenticating_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        security
    ),
    db: Session = Depends(get_db),
) -> Admin:
    """Resolve the bearer token to an active Admin.

    This is authentication only — it does NOT enforce the
    ``must_change_password`` gate, so it backs the endpoints that a
    user with a forced password change still needs to reach
    (login is unauthenticated; this covers change-password and
    reading one's own profile). Everything else must depend on
    ``get_current_admin``.
    """

    if not SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="JWT secret is not configured.",
        )

    # No / malformed Authorization header -> not authenticated.
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated.",
        )

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        admin_id = payload.get("sub")

        if admin_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token.",
            )

        try:
            admin_id = int(admin_id)

        except (
            TypeError,
            ValueError,
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token.",
            )

        admin = (
            db.query(Admin)
            .filter(
                Admin.id == admin_id
            )
            .first()
        )

        if admin is None:
            raise HTTPException(
                status_code=401,
                detail="Admin account not found.",
            )

        if not admin.is_active:
            raise HTTPException(
                status_code=403,
                detail="This account has been disabled.",
            )

        # Token freshness: the version the token was minted with must
        # still match the account. A password change / administrative
        # reset bumps ``admin.token_version``, so every token issued
        # earlier fails here. Pre-B6 tokens (no claim) are treated as
        # stale. The response is the ordinary "invalid token" error —
        # no "version mismatch" detail is leaked to the client.
        token_version = payload.get("token_version")

        if (
            token_version is None
            or token_version != admin.token_version
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token.",
            )

        return admin

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=401,
            detail="Authentication token has expired.",
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token.",
        )


def get_current_admin(
    admin: Admin = Depends(
        get_authenticating_admin
    ),
) -> Admin:
    """Authenticated Admin for normal application access.

    Enforces the ``must_change_password`` gate here, at the
    authorization layer, so a valid token cannot be used to reach a
    protected endpoint while a forced password change is outstanding.
    """

    if admin.must_change_password:
        raise HTTPException(
            status_code=403,
            detail=_PASSWORD_CHANGE_REQUIRED_DETAIL,
        )

    return admin


def require_super_admin(
    admin: Admin = Depends(
        get_current_admin
    ),
) -> Admin:

    if admin.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Super Admin access required.",
        )

    return admin


def require_admin_or_super_admin(
    admin: Admin = Depends(
        get_current_admin
    ),
) -> Admin:

    if admin.role not in {
        "super_admin",
        "admin",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "Admin or Super Admin access required."
            ),
        )

    return admin


def require_password_changed(
    admin: Admin = Depends(
        get_authenticating_admin
    ),
) -> Admin:
    """Explicit ``must_change_password`` gate.

    Equivalent to ``get_current_admin`` (which now also enforces it);
    kept as a named dependency for the routes that already reference
    it directly.
    """

    if admin.must_change_password:
        raise HTTPException(
            status_code=403,
            detail=_PASSWORD_CHANGE_REQUIRED_DETAIL,
        )

    return admin


def require_permission(
    permission: Permission,
):
    def dependency(
        admin: Admin = Depends(
            require_password_changed
        ),
    ) -> Admin:

        if not has_permission(
            admin.role,
            permission,
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "You do not have permission "
                    "to perform this action."
                ),
            )

        return admin

    return dependency