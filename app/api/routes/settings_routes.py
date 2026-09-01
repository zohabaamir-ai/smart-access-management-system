from fastapi import (
    APIRouter,
    Depends,
)

from app.db.db_models.admin import Admin

from app.core.permissions import Permission

from app.services.system_setting_service import (
    SystemSettingService,
)

from app.schemas.settings_schemas import (
    SystemSettingsResponse,
    SystemSettingsUpdateRequest,
)

from app.api.auth_dependencies import (
    require_permission,
)

from app.api.deps import get_system_setting_service


router = APIRouter(
    prefix="/settings",
    tags=["Settings"],
)


# =============================================================
# SYSTEM CONFIG
#
# PERMISSIONS.md → Settings — system config:
#   Read:   Super Admin only
#   Update: Super Admin only
#
# Gated by MANAGE_SETTINGS, which is granted to super_admin
# only. Admin / Operator -> 403; unauthenticated -> 401.
# Personal settings (theme, own password) are handled by the
# /auth routes and are intentionally NOT here.
# =============================================================

@router.get(
    "/system",
    response_model=SystemSettingsResponse,
)
async def get_system_settings(
    service: SystemSettingService = Depends(
        get_system_setting_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_SETTINGS
        )
    ),
):

    return SystemSettingsResponse(
        settings=service.get_system_settings(),
    )


@router.put(
    "/system",
    response_model=SystemSettingsResponse,
)
async def update_system_settings(
    request: SystemSettingsUpdateRequest,
    service: SystemSettingService = Depends(
        get_system_setting_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_SETTINGS
        )
    ),
):

    updated = service.update_system_settings(
        updates=request.settings,
        updated_by=current_admin.id,
    )

    return SystemSettingsResponse(
        settings=updated,
    )
