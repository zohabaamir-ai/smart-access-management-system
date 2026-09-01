from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Integer,
    String,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.db.db_models.base import Base


class PersonActivity(Base):
    __tablename__ = "person_activities"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    person_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )

    person_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    action: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    performed_by: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(
            timezone.utc
        ),
        nullable=False,
        index=True,
    )