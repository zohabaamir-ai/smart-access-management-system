from fastapi import (
    APIRouter,
    Depends,
)

from app.db.db_models.admin import Admin

from app.core.permissions import Permission

from app.services.auth_service import (
    AuthService,
)

from app.schemas.auth_schemas import (
    CreateUserRequest,
    CreateUserResponse,
    UpdateUserRequest,
    AdminResponse,
)

from app.api.auth_dependencies import (
    require_permission,
)

from app.api.deps import get_auth_service


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


# =============================================================
# CREATE USER
# =============================================================

@router.post(
    "",
    response_model=CreateUserResponse,
)
async def create_user(
    request: CreateUserRequest,
    current_admin: Admin = Depends(
        require_permission(
            Permission.CREATE_USERS
        )
    ),
    service: AuthService = Depends(
        get_auth_service
    ),
):

    admin, temporary_password = (
        service.create_admin(
            full_name=request.full_name,
            username=request.username,
            role=request.role,
            creator_role=current_admin.role,
            display_name=request.display_name,
        )
    )

    return CreateUserResponse(
        id=admin.id,
        full_name=admin.full_name,
        username=admin.username,
        role=admin.role,
        temporary_password=temporary_password,
    )


# =============================================================
# EDIT USER IDENTITY (full_name / display_name only)
#
# Dedicated, narrow endpoint. Role, password, account status and
# username each have their own flow and cannot be changed here.
#   Super Admin -> any account.
#   Admin       -> Operator accounts only.
# =============================================================

@router.patch(
    "/{user_id}",
    response_model=AdminResponse,
)
async def update_user_identity(
    user_id: int,
    request: UpdateUserRequest,
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_USERS
        )
    ),
    service: AuthService = Depends(
        get_auth_service
    ),
):

    return service.update_user_identity(
        target_admin_id=user_id,
        requesting_admin_id=current_admin.id,
        requesting_admin_role=current_admin.role,
        full_name=request.full_name,
        display_name=request.display_name,
    )


# =============================================================
# VIEW USERS
# =============================================================

@router.get(
    "",
    response_model=list[AdminResponse],
)
async def get_users(
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_USERS
        )
    ),
    service: AuthService = Depends(
        get_auth_service
    ),
):

    return (
        service.admin_repository
        .get_all_admins()
    )


# =============================================================
# RESET USER PASSWORD
# =============================================================

@router.post(
    "/{user_id}/reset-password",
)
async def reset_user_password(
    user_id: int,
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_USERS
        )
    ),
    service: AuthService = Depends(
        get_auth_service
    ),
):

    admin, temporary_password = (
        service.reset_admin_password(
            target_admin_id=user_id,
            requesting_admin_id=current_admin.id,
            requesting_admin_role=current_admin.role,
        )
    )

    return {
        "message": (
            "Password reset successfully."
        ),
        "user_id": admin.id,
        "username": admin.username,
        "temporary_password": (
            temporary_password
        ),
    }


# =============================================================
# UPDATE USER STATUS
# =============================================================

@router.patch(
    "/{user_id}/status",
)
async def update_user_status(
    user_id: int,
    is_active: bool,
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_USERS
        )
    ),
    service: AuthService = Depends(
        get_auth_service
    ),
):

    admin = service.update_admin_status(
        target_admin_id=user_id,
        requesting_admin_id=current_admin.id,
        requesting_admin_role=current_admin.role,
        is_active=is_active,
    )

    return {
        "message": (
            "User activated successfully."
            if admin.is_active
            else "User deactivated successfully."
        ),
        "id": admin.id,
        "username": admin.username,
        "is_active": admin.is_active,
    }


# =============================================================
# UPDATE USER ROLE
# =============================================================

@router.patch(
    "/{user_id}/role",
)
async def update_user_role(
    user_id: int,
    role: str,
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_USERS
        )
    ),
    service: AuthService = Depends(
        get_auth_service
    ),
):

    admin = service.update_admin_role(
        target_admin_id=user_id,
        requesting_admin_id=current_admin.id,
        requesting_admin_role=current_admin.role,
        role=role,
    )

    return {
        "message": (
            "User role updated successfully."
        ),
        "id": admin.id,
        "username": admin.username,
        "role": admin.role,
    }


# =============================================================
# TEMPORARY ACCOUNT UNLOCK
# =============================================================

@router.patch(
    "/{user_id}/unlock",
)
async def unlock_user_account(
    user_id: int,
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_USERS
        )
    ),
    service: AuthService = Depends(
        get_auth_service
    ),
):

    admin = service.unlock_admin_account(
        target_admin_id=user_id,
        requesting_admin_id=current_admin.id,
        requesting_admin_role=current_admin.role,
    )

    return {
        "message": (
            "User account unlocked successfully."
        ),
        "id": admin.id,
        "username": admin.username,
        "failed_login_attempts": (
            admin.failed_login_attempts
        ),
        "locked_until": admin.locked_until,
    }


# =============================================================
# DELETE USER
#
# PERMISSIONS.md → Users → Delete:
#   Super Admin -> any account (except self).
#   Admin       -> Operator accounts only.
#
# Coarse gate: MANAGE_USERS (Super Admin, Admin).
# Fine-grained privilege scoping is enforced in AuthService.
# =============================================================

@router.delete(
    "/{user_id}",
)
async def delete_user(
    user_id: int,
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_USERS
        )
    ),
    service: AuthService = Depends(
        get_auth_service
    ),
):

    admin = service.delete_admin(
        target_admin_id=user_id,
        requesting_admin_id=current_admin.id,
        requesting_admin_role=current_admin.role,
    )

    return {
        "message": (
            "User deleted successfully."
        ),
        "id": admin.id,
        "username": admin.username,
    }