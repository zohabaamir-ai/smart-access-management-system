from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
)

from app.db.db_models.admin import Admin

from app.core.permissions import Permission

from app.schemas.activity_schemas import (
    ActivityResponse,
)

from app.services.activity_service import (
    ActivityService,
)

from app.api.auth_dependencies import (
    require_permission,
)

from app.api.deps import (
    get_activity_service,
)


router = APIRouter(
    prefix="/activity",
    tags=["Activity"],
)


# =============================================================
# ACTIVITY = View + Filter + Export
#
# A read/query layer over Recognition Events. No separate
# storage, no deletion. The list and the CSV export share the
# exact same filter set and query path in ActivityService.
# =============================================================


def _validate_date_range(
    start_date: date | None,
    end_date: date | None,
) -> None:

    if (
        start_date is not None
        and end_date is not None
        and end_date < start_date
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "End date cannot be "
                "before start date."
            ),
        )


@router.get(
    "",
    response_model=list[ActivityResponse],
)
async def get_activity(
    start_date: date | None = None,
    end_date: date | None = None,
    person_id: int | None = None,
    camera_id: int | None = None,
    search: str | None = None,
    service: ActivityService = Depends(
        get_activity_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.VIEW_ACTIVITY
        )
    ),
):
    _validate_date_range(start_date, end_date)

    return service.list_activity(
        start_date=start_date,
        end_date=end_date,
        person_id=person_id,
        camera_id=camera_id,
        search=search,
    )


@router.get(
    "/export",
)
async def export_activity(
    start_date: date | None = None,
    end_date: date | None = None,
    person_id: int | None = None,
    camera_id: int | None = None,
    search: str | None = None,
    service: ActivityService = Depends(
        get_activity_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.EXPORT_ACTIVITY
        )
    ),
):
    _validate_date_range(start_date, end_date)

    csv_text = service.export_activity_csv(
        start_date=start_date,
        end_date=end_date,
        person_id=person_id,
        camera_id=camera_id,
        search=search,
    )

    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={
            "Content-Disposition": (
                'attachment; filename="activity.csv"'
            ),
        },
    )
