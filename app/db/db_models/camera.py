from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    String,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.db_models.base import Base


class Camera(Base):
    """A recognition point that captures an image and sends it to the
    recognition system.

    V1 Camera has no hardware pairing/provisioning/heartbeat/key concept
    (that Terminal subsystem was removed). ``is_active`` expresses the
    Disabled lifecycle state; ``decommissioned_at`` soft-deletes a Camera
    while preserving its historical Recognition Events.
    """

    __tablename__ = "cameras"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(150),
        index=True,
        nullable=False,
    )

    location: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Camera/station-level recognition mode, shared across every device
    # that opens the public recognition URL:
    #   True   the station recognises deliberately on its own when a
    #          face appears (Auto)
    #   False  the station waits for a manual "Recognise" press (Manual)
    # Set by management (PATCH /cameras/{id}); read by the public
    # station (GET /cameras/slug/{slug}). Not a browser-local setting.
    auto_recognition: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(
            timezone.utc
        ),
        nullable=False,
    )

    # Last time the camera's PUBLIC recognition station
    # (/recognition/camera/:slug) sent a session heartbeat or a
    # recognition frame. Backend-authoritative cross-device ONLINE
    # signal: the camera is ONLINE while this is fresh. NULL until a
    # public session has ever run. The management camera preview does
    # NOT touch this column.
    last_seen_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    decommissioned_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    recognition_events: Mapped[
        list["RecognitionEvent"]
    ] = relationship(
        "RecognitionEvent",
        back_populates="camera",
    )
