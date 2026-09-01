from fastapi import APIRouter, Depends

from app.db.db_models.admin import Admin

from app.core.permissions import Permission

from app.schemas.dashboard_schemas import (
    DashboardResponse,
)

from app.services.dashboard_service import (
    DashboardService,
)

from app.api.auth_dependencies import (
    require_permission,
)

from app.api.deps import (
    get_dashboard_service,
)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get(
    "",
    response_model=DashboardResponse,
)
async def get_dashboard(
    service: DashboardService = Depends(
        get_dashboard_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.VIEW_DASHBOARD
        )
    ),
):
    return service.get_dashboard()
