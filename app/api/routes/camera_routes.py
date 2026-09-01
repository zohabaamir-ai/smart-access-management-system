from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from app.db.db_models.admin import Admin
from app.db.db_models.camera import Camera

from app.core.permissions import Permission

from app.services.camera_service import (
    CameraService,
    derive_camera_status,
)

from app.schemas.camera_schemas import (
    CameraCreateRequest,
    CameraResponse,
    CameraUpdateRequest,
)

from app.api.auth_dependencies import (
    require_permission,
)

from app.api.deps import get_camera_service


router = APIRouter(
    prefix="/cameras",
    tags=["Cameras"],
)


# =============================================================
# RESPONSE MAPPING
#
# status is derived, not a stored column:
#   disabled  is_active=False (authoritative)
#   online    fresh public recognition-session heartbeat
#             (cameras.last_seen_at within the TTL)
#   offline   enabled, no fresh public session
# See app/services/camera_service.py :: derive_camera_status.
# =============================================================

def _to_response(camera: Camera) -> CameraResponse:
    return CameraResponse(
        id=camera.id,
        name=camera.name,
        slug=camera.slug,
        location=camera.location,
        is_active=camera.is_active,
        status=derive_camera_status(camera),
        created_at=camera.created_at,
    )


# =============================================================
# GET CAMERAS
#
# Management application only.
# =============================================================

@router.get(
    "",
    response_model=list[CameraResponse],
)
async def get_cameras(
    service: CameraService = Depends(
        get_camera_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.VIEW_CAMERAS
        )
    ),
):

    return [
        _to_response(camera)
        for camera in service.get_all_cameras()
    ]


# =============================================================
# GET CAMERA BY SLUG
#
# PUBLIC ENDPOINT
#
# Backs the dedicated recognition URL /camera/<slug>. It does
# NOT require an admin JWT and exposes no management surface.
# =============================================================

@router.get(
    "/slug/{slug}",
    response_model=CameraResponse,
)
async def get_camera_by_slug(
    slug: str,
    service: CameraService = Depends(
        get_camera_service
    ),
):

    try:
        camera = (
            service.get_camera_by_slug(
                slug=slug,
            )
        )

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )

    return _to_response(camera)


# =============================================================
# CREATE CAMERA
#
# Management application only.
# =============================================================

@router.post(
    "",
    response_model=CameraResponse,
)
async def create_camera(
    request: CameraCreateRequest,
    service: CameraService = Depends(
        get_camera_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_CAMERAS
        )
    ),
):

    try:
        camera = (
            service.create_camera(
                name=request.name,
                location=request.location,
            )
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    return _to_response(camera)


# =============================================================
# GET CAMERA BY ID
#
# Management application only.
# =============================================================

@router.get(
    "/{camera_id}",
    response_model=CameraResponse,
)
async def get_camera_by_id(
    camera_id: int,
    service: CameraService = Depends(
        get_camera_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.VIEW_CAMERAS
        )
    ),
):

    try:
        camera = (
            service.get_camera_by_id(
                camera_id=camera_id,
            )
        )

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )

    return _to_response(camera)


# =============================================================
# UPDATE CAMERA
#
# Management application only. Toggling is_active is the
# Disable / Enable action.
# =============================================================

@router.patch(
    "/{camera_id}",
    response_model=CameraResponse,
)
async def update_camera(
    camera_id: int,
    request: CameraUpdateRequest,
    service: CameraService = Depends(
        get_camera_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_CAMERAS
        )
    ),
):

    try:
        camera = (
            service.update_camera(
                camera_id=camera_id,
                name=request.name,
                location=request.location,
                is_active=request.is_active,
            )
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    return _to_response(camera)


# =============================================================
# DECOMMISSION CAMERA
#
# Management application only. Soft delete: the Camera row and
# its historical Recognition Events are preserved.
# =============================================================

@router.delete(
    "/{camera_id}",
)
async def decommission_camera(
    camera_id: int,
    service: CameraService = Depends(
        get_camera_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_CAMERAS
        )
    ),
):

    try:
        service.decommission_camera(
            camera_id=camera_id,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    return {
        "message":
            "Camera decommissioned successfully."
    }
