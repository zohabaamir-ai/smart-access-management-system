import re
from datetime import datetime, timedelta, timezone

from app.core.config import CAMERA_SESSION_TTL_SECONDS
from app.db.db_models.camera import Camera
from app.repositories.camera_repository import (
    CameraRepository,
)


def derive_camera_status(camera: Camera) -> str:
    """User-facing camera status.

    disabled  administratively disabled (is_active=False) — authoritative.
    online    the public recognition station sent a fresh heartbeat /
              recognition frame (last_seen_at within CAMERA_SESSION_TTL_SECONDS).
    offline   enabled, but no fresh public recognition session.

    Opening the management camera preview never sets last_seen_at, so a
    preview can never make a camera ONLINE.
    """

    if not camera.is_active:
        return "disabled"

    last_seen = camera.last_seen_at

    if last_seen is not None:
        if last_seen.tzinfo is None:
            last_seen = last_seen.replace(
                tzinfo=timezone.utc
            )
        fresh_after = datetime.now(
            timezone.utc
        ) - timedelta(
            seconds=CAMERA_SESSION_TTL_SECONDS
        )
        if last_seen >= fresh_after:
            return "online"

    return "offline"


class CameraService:

    def __init__(
        self,
        camera_repository: CameraRepository,
    ):
        self.camera_repository = (
            camera_repository
        )

    # =========================================================
    # SLUG GENERATION
    # =========================================================

    def generate_slug(
        self,
        name: str,
    ) -> str:

        slug = (
            name.strip()
            .lower()
        )

        slug = re.sub(
            r"[^a-z0-9]+",
            "-",
            slug,
        )

        slug = slug.strip("-")

        if not slug:
            raise ValueError(
                "Camera name must contain letters or numbers."
            )

        base_slug = slug
        counter = 2

        while (
            self.camera_repository
            .get_active_by_slug(slug)
            is not None
        ):
            slug = (
                f"{base_slug}-{counter}"
            )

            counter += 1

        return slug

    # =========================================================
    # GET ALL
    # =========================================================

    def get_all_cameras(
        self,
    ) -> list[Camera]:

        return (
            self.camera_repository
            .get_all_cameras()
        )

    # =========================================================
    # GET BY ID
    # =========================================================

    def get_camera_by_id(
        self,
        camera_id: int,
    ) -> Camera:

        camera = (
            self.camera_repository
            .get_by_id(
                camera_id
            )
        )

        if camera is None:
            raise ValueError(
                "Camera not found."
            )

        if (
            camera.decommissioned_at
            is not None
        ):
            raise ValueError(
                "This camera has been decommissioned."
            )

        return camera

    # =========================================================
    # RECOGNITION-USABLE CAMERA RESOLUTION
    #
    # Both recognition entry points must resolve to a Camera
    # that is safe to recognize through: it exists, has not
    # been decommissioned, and is not disabled. The dedicated
    # public URL keys by slug; the management flow keys by id.
    # Both go through the same _assert_usable_for_recognition
    # gate so their Camera-state behavior is identical.
    #
    # V1 has no liveness signal, so "offline" is not a state a
    # Camera can currently reach; disabled (is_active=False) is
    # the only rejection here.
    # =========================================================

    def _assert_usable_for_recognition(
        self,
        camera: Camera,
    ) -> None:

        if (
            camera.decommissioned_at
            is not None
        ):
            raise ValueError(
                "This camera has been decommissioned."
            )

        if not camera.is_active:
            raise ValueError(
                "This camera is currently disabled."
            )

    def get_camera_by_slug(
        self,
        slug: str,
    ) -> Camera:
        """Resolve a recognition-usable Camera by its URL slug
        (dedicated public recognition endpoint)."""

        camera = (
            self.camera_repository
            .get_by_slug(slug)
        )

        if camera is None:
            raise ValueError(
                "Camera not found."
            )

        self._assert_usable_for_recognition(
            camera
        )

        return camera

    def mark_session_seen(
        self,
        slug: str,
    ) -> Camera:
        """Record a public recognition-station heartbeat for the camera
        with this slug. Resolves through the same usability gate as
        recognition (rejects unknown / decommissioned / disabled), then
        stamps ``last_seen_at``."""

        camera = self.get_camera_by_slug(slug=slug)

        return self.touch_session(camera)

    def touch_session(
        self,
        camera: Camera,
    ) -> Camera:
        """Stamp ``last_seen_at`` on an already-resolved public-station
        camera (used by the slug recognition frame path)."""

        return (
            self.camera_repository
            .touch_last_seen(camera)
        )

    def get_camera_for_recognition(
        self,
        camera_id: int,
    ) -> Camera:
        """Resolve a recognition-usable Camera by its id
        (management recognition flow)."""

        camera = (
            self.camera_repository
            .get_by_id(camera_id)
        )

        if camera is None:
            raise ValueError(
                "Camera not found."
            )

        self._assert_usable_for_recognition(
            camera
        )

        return camera

    # =========================================================
    # CREATE
    # =========================================================

    def create_camera(
        self,
        name: str,
        location: str,
    ) -> Camera:

        name = name.strip()
        location = location.strip()

        if not name:
            raise ValueError(
                "Camera name cannot be empty."
            )

        if not location:
            raise ValueError(
                "Camera location cannot be empty."
            )

        # -----------------------------------------------------
        # Only a currently active/non-decommissioned camera
        # should reserve the name.
        # -----------------------------------------------------

        existing_camera = (
            self.camera_repository
            .get_active_by_name(
                name
            )
        )

        if existing_camera is not None:
            raise ValueError(
                "A camera with this name already exists."
            )

        slug = self.generate_slug(
            name
        )

        return (
            self.camera_repository
            .create(
                name=name,
                slug=slug,
                location=location,
            )
        )

    # =========================================================
    # UPDATE
    # =========================================================

    def update_camera(
        self,
        camera_id: int,
        name: str | None = None,
        location: str | None = None,
        is_active: bool | None = None,
        auto_recognition: bool | None = None,
    ) -> Camera:

        camera = (
            self.camera_repository
            .get_by_id(
                camera_id
            )
        )

        if camera is None:
            raise ValueError(
                "Camera not found."
            )

        if (
            camera.decommissioned_at
            is not None
        ):
            raise ValueError(
                "Cannot update a decommissioned camera."
            )

        if (
            name is None
            and location is None
            and is_active is None
            and auto_recognition is None
        ):
            raise ValueError(
                "No camera fields were provided."
            )

        if name is not None:

            name = name.strip()

            if not name:
                raise ValueError(
                    "Camera name cannot be empty."
                )

            if name != camera.name:

                existing_camera = (
                    self.camera_repository
                    .get_active_by_name(
                        name
                    )
                )

                if (
                    existing_camera
                    is not None
                    and existing_camera.id
                    != camera.id
                ):
                    raise ValueError(
                        "A camera with this name already exists."
                    )

                camera.name = name

        if location is not None:

            location = location.strip()

            if not location:
                raise ValueError(
                    "Camera location cannot be empty."
                )

        return (
            self.camera_repository
            .update(
                camera=camera,
                name=name,
                location=location,
                is_active=is_active,
                auto_recognition=auto_recognition,
            )
        )

    # =========================================================
    # DECOMMISSION
    # =========================================================

    def decommission_camera(
        self,
        camera_id: int,
    ) -> Camera:

        camera = (
            self.camera_repository
            .get_by_id(
                camera_id
            )
        )

        if camera is None:
            raise ValueError(
                "Camera not found."
            )

        if (
            camera.decommissioned_at
            is not None
        ):
            raise ValueError(
                "Camera has already been decommissioned."
            )

        return (
            self.camera_repository
            .decommission(
                camera
            )
        )
