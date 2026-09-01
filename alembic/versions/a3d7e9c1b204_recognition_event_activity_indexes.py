"""recognition_event activity indexes

Activity (the canonical filtered recognition-history query) filters
Recognition Events by ``timestamp`` (range + ordering), ``person_id`` and
``camera_id``. Add a btree index for each.

Revision ID: a3d7e9c1b204
Revises: f2b7c1a9d4e0
Create Date: 2026-08-29
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a3d7e9c1b204"
down_revision: Union[str, Sequence[str], None] = "f2b7c1a9d4e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add Activity hot-path indexes."""
    op.create_index(
        op.f("ix_recognition_events_timestamp"),
        "recognition_events",
        ["timestamp"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recognition_events_person_id"),
        "recognition_events",
        ["person_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recognition_events_camera_id"),
        "recognition_events",
        ["camera_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema: drop the Activity hot-path indexes."""
    op.drop_index(
        op.f("ix_recognition_events_camera_id"),
        table_name="recognition_events",
    )
    op.drop_index(
        op.f("ix_recognition_events_person_id"),
        table_name="recognition_events",
    )
    op.drop_index(
        op.f("ix_recognition_events_timestamp"),
        table_name="recognition_events",
    )
