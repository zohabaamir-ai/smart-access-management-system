from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.db_models.camera import Camera


class CameraRepository:

    def __init__(
        self,
        db: Session,
    ):
        self.db = db

    # =========================================================
    # LOOKUPS
    # =========================================================

    def get_by_id(
        self,
        camera_id: int,
    ) -> Camera | None:

        return (
            self.db.query(Camera)
            .filter(
                Camera.id
                == camera_id
            )
            .first()
        )

    def get_by_slug(
        self,
        slug: str,
    ) -> Camera | None:

        return (
            self.db.query(Camera)
            .filter(
                Camera.slug == slug,
                Camera.decommissioned_at.is_(None),
            )
            .first()
        )

    def get_by_name(
        self,
        name: str,
    ) -> Camera | None:

        return (
            self.db.query(Camera)
            .filter(
                Camera.name
                == name
            )
            .first()
        )

    # =========================================================
    # ACTIVE NAME LOOKUP
    #
    # Used when creating/updating cameras.
    #
    # Decommissioned historical cameras do not reserve
    # the camera name.
    # =========================================================

    def get_active_by_name(
        self,
        name: str,
    ) -> Camera | None:

        return (
            self.db.query(Camera)
            .filter(
                Camera.name
                == name,
                Camera.decommissioned_at
                .is_(None),
            )
            .first()
        )

    # =========================================================
    # ACTIVE SLUG LOOKUP
    #
    # Used for generating new camera slugs.
    # =========================================================

    def get_active_by_slug(
        self,
        slug: str,
    ) -> Camera | None:

        return (
            self.db.query(Camera)
            .filter(
                Camera.slug
                == slug,
                Camera.decommissioned_at
                .is_(None),
            )
            .first()
        )

    # =========================================================
    # LIST
    # =========================================================

    def get_all_cameras(
        self,
    ) -> list[Camera]:

        return (
            self.db.query(Camera)
            .filter(
                Camera.decommissioned_at
                .is_(None)
            )
            .order_by(
                Camera.id
            )
            .all()
        )

    # =========================================================
    # CREATE
    # =========================================================

    def create(
        self,
        name: str,
        slug: str,
        location: str,
    ) -> Camera:

        camera = Camera(
            name=name,
            slug=slug,
            location=location,
            is_active=True,
        )

        self.db.add(
            camera
        )

        self.db.commit()

        self.db.refresh(
            camera
        )

        return camera

    # =========================================================
    # UPDATE
    # =========================================================

    def update(
        self,
        camera: Camera,
        name: str | None = None,
        location: str | None = None,
        is_active: bool | None = None,
    ) -> Camera:

        if name is not None:
            camera.name = name

        if location is not None:
            camera.location = location

        if is_active is not None:
            camera.is_active = is_active

        self.db.commit()

        self.db.refresh(
            camera
        )

        return camera

    # =========================================================
    # DECOMMISSION
    # =========================================================

    def decommission(
        self,
        camera: Camera,
    ) -> Camera:

        camera.is_active = False

        camera.decommissioned_at = (
            datetime.now(
                timezone.utc
            )
        )

        self.db.commit()

        self.db.refresh(
            camera
        )

        return camera
