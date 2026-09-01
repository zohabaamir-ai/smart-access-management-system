from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)

from app.db.db_models.admin import Admin

from app.services.recognition_service import (
    RecognitionService,
)
from app.services.camera_service import (
    CameraService,
)

from app.schemas.recognition_schemas import (
    RecognitionResponse,
)

from app.api.auth_dependencies import (
    require_password_changed,
)

from app.api.deps import (
    get_recognition_service,
    get_camera_service,
)

from app.api.uploads import decode_image_upload


router = APIRouter(
    prefix="/recognition",
    tags=["Recognition"],
)


# =============================================================
# RECOGNITION — two entry points, one canonical operation.
#
#   POST /recognition            -> management Camera flow
#   POST /recognition/camera/{slug} -> dedicated public Camera URL
#
# Each route only: parses HTTP input, resolves an explicit
# Camera through CameraService, and formats the response.
# RecognitionService.recognize_faces(image, camera_id) owns the
# whole recognition workflow and is the single point at which a
# Recognition Event is created.
# =============================================================


# =============================================================
# MANAGEMENT CAMERA RECOGNITION
#
# Requires an authenticated management session. The Camera is
# named explicitly by the request (camera_id form field) — it
# is never inferred from the user, an env var, a device key, or
# a default. A successful recognition is persisted as a
# Recognition Event attributed to that Camera.
# =============================================================

@router.post(
    "",
    response_model=RecognitionResponse,
)
async def recognize(
    camera_id: int = Form(...),
    file: UploadFile = File(...),
    service: RecognitionService = Depends(
        get_recognition_service
    ),
    camera_service: CameraService = Depends(
        get_camera_service
    ),
    current_admin: Admin = Depends(
        require_password_changed
    ),
):
    try:
        camera = (
            camera_service
            .get_camera_for_recognition(
                camera_id
            )
        )

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )

    image = await decode_image_upload(file)

    try:
        return service.recognize_faces(
            image,
            camera_id=camera.id,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


# =============================================================
# DEDICATED CAMERA URL RECOGNITION
#
# Public endpoint behind /camera/<slug>. The Camera is
# identified by its URL slug; no session and no device key.
# Exposes recognition only — no management/configuration
# surface. A successful recognition is persisted as a
# Recognition Event attributed to that Camera.
# =============================================================

@router.post(
    "/camera/{slug}",
    response_model=RecognitionResponse,
)
async def recognize_at_camera(
    slug: str,
    file: UploadFile = File(...),
    service: RecognitionService = Depends(
        get_recognition_service
    ),
    camera_service: CameraService = Depends(
        get_camera_service
    ),
):
    try:
        camera = (
            camera_service
            .get_camera_by_slug(
                slug=slug,
            )
        )

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )

    # A recognizing station is a present station: refresh the
    # cross-device session heartbeat (the management-by-id path
    # deliberately does NOT do this).
    camera_service.touch_session(camera)

    image = await decode_image_upload(file)

    try:
        return service.recognize_faces(
            image,
            camera_id=camera.id,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


# =============================================================
# DEDICATED CAMERA URL — SESSION HEARTBEAT
#
# Public endpoint. The recognition station calls this on open
# and on a short interval while its camera stream is live, so
# the management app (any device) can show the camera ONLINE.
# It performs no recognition and creates no Recognition Event.
# Opening the management camera preview does NOT call this.
# =============================================================

@router.post(
    "/camera/{slug}/heartbeat",
)
async def recognition_session_heartbeat(
    slug: str,
    camera_service: CameraService = Depends(
        get_camera_service
    ),
):
    try:
        camera = (
            camera_service
            .mark_session_seen(
                slug=slug,
            )
        )

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )

    return {
        "slug": camera.slug,
        "status": "online",
    }
