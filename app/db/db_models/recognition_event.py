from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.db_models.base import Base


class RecognitionEvent(Base):
    __tablename__ = "recognition_events"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    person_id: Mapped[int] = mapped_column(
        ForeignKey("persons.id"),
        index=True,
    )

    camera_id: Mapped[int] = mapped_column(
        ForeignKey("cameras.id"),
        index=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    match_distance: Mapped[float] = mapped_column(
        Float
    )

    person: Mapped["Person"] = relationship(
        "Person",
        back_populates="recognition_events",
    )

    camera: Mapped["Camera"] = relationship(
        "Camera",
        back_populates="recognition_events",
    )