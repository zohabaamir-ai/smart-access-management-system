"""drop notifications

B10 — the pre-V1 Notification subsystem is removed. Every event it
carried is already covered elsewhere:

* successful recognition  -> Recognition Event + Activity
* person enrolled         -> person_activities audit row + the
                             transactional API response

V1 has no asynchronous multi-administrator workflow, no camera-liveness
subsystem, and no system-health backend, so there is no event left that
needs a persistent attention mechanism. The table is dropped.

``downgrade`` recreates the table exactly as the baseline migration
(e1289f3287bc) defined it, so a rollback restores the prior schema
without restoring any application code.

Revision ID: e7c3a1f5d9b8
Revises: d5b2e8c3f9a1
Create Date: 2026-08-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e7c3a1f5d9b8"
down_revision: Union[str, Sequence[str], None] = "d5b2e8c3f9a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop the notifications table."""
    op.drop_table("notifications")


def downgrade() -> None:
    """Recreate notifications exactly as the baseline schema defined it."""
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=30), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False
        ),
        sa.Column("related_person_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["related_person_id"],
            ["persons.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
