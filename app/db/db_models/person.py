from datetime import datetime, timezone

from sqlalchemy import (
    ARRAY,
    DateTime,
    Float,
    ForeignKey,
    String,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.db_models.base import Base


class Person(Base):
    __tablename__ = "persons"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    identifier: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    embedding: Mapped[list[float]] = mapped_column(
        ARRAY(Float),
        nullable=False,
    )

    photo_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # ---------------------------------------------------------
    # Provenance: the management account that registered this
    # person. Metadata only — it does NOT drive any privacy
    # masking or visibility decision in V1 (all management roles
    # may view every Person's CNIC and photo).
    # Nullable so system/legacy records remain valid, and set
    # to NULL if that account is later deleted.
    # ---------------------------------------------------------

    registered_by_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "admins.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(
            timezone.utc
        ),
        nullable=False,
        index=True,
    )

    recognition_events: Mapped[
        list["RecognitionEvent"]
    ] = relationship(
        "RecognitionEvent",
        back_populates="person",
        cascade="all, delete-orphan",
    )