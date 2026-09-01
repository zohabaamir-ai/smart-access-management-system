"""camera auto_recognition (cross-device recognition mode)

Adds ``cameras.auto_recognition`` (BOOLEAN NOT NULL, default false). It
replaces the previous per-browser localStorage flag so the public
recognition station shows the same Auto/Manual mode on every device that
opens the camera. Management sets it via PATCH /cameras/{id}; the public
GET /cameras/slug/{slug} returns it. No other schema change.

Existing rows are backfilled to ``false`` via a temporary server default,
which is then removed so the column matches the model (Python-side
default only), keeping alembic-upgrade and create_all schemas identical.

Revision ID: c1d8b6a4e372
Revises: a9f4c2e15b7d
Create Date: 2026-09-03
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1d8b6a4e372"
down_revision: Union[str, Sequence[str], None] = "a9f4c2e15b7d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cameras",
        sa.Column(
            "auto_recognition",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.alter_column(
        "cameras",
        "auto_recognition",
        server_default=None,
    )


def downgrade() -> None:
    op.drop_column("cameras", "auto_recognition")
