"""camera last_seen_at (cross-device recognition-session presence)

Adds a single nullable ``cameras.last_seen_at`` timestamp. The public
recognition station (``POST /recognition/camera/{slug}`` and its
``/heartbeat`` sibling) stamps it; the management app derives a
cross-device ONLINE status from its freshness. NULL until a public
session has ever run. No other schema change.

Revision ID: a9f4c2e15b7d
Revises: e7c3a1f5d9b8
Create Date: 2026-09-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a9f4c2e15b7d"
down_revision: Union[str, Sequence[str], None] = "e7c3a1f5d9b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cameras",
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("cameras", "last_seen_at")
