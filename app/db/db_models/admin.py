from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.db_models.base import Base


def _display_name_from_full_name(context):
    """Seed ``display_name`` from ``full_name`` when a row is created
    without an explicit display name (the finalized V1 identity rule:
    an account's display name starts out equal to its original name).
    Applies to ORM inserts that omit the column — the bootstrap script,
    ``AdminRepository.create_admin``, tests.
    """
    return context.get_current_parameters()["full_name"]


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    # Original / registered name. Set at account creation; not editable
    # through self-service profile update.
    full_name: Mapped[str] = mapped_column(
        String(100),
    )

    # Name the user wants shown in the application UI / header. Distinct
    # from both full_name and username. Editable via PATCH /auth/profile.
    display_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default=_display_name_from_full_name,
    )

    profile_image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255)
    )

    role: Mapped[str] = mapped_column(
        String(30),
        default="operator",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    failed_login_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Number of temporary lockouts this account has accrued in its
    # current bad streak. Drives progressive lockout duration and is
    # cleared on a successful login (see AuthService). It NEVER causes
    # a permanent disable.
    lockout_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    must_change_password: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    # Bumped on every password change / administrative password reset.
    # An access token carries the value it was minted with; a request
    # whose token_version no longer matches this column is rejected,
    # so a password change invalidates every token issued before it.
    token_version: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )