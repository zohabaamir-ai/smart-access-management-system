"""admin display_name

B7 — management profile / display identity. Adds ``admins.display_name``:
the name a management user wants shown in the UI header, distinct from
``full_name`` (original / registered name) and ``username`` (credential).

Backfill for existing accounts: ``display_name = full_name`` (deterministic;
does not touch full_name or username). The column ends up NOT NULL with no
server default, matching the model (application-side default seeds it from
full_name on future inserts).

Revision ID: d5b2e8c3f9a1
Revises: c4f1a7d9e6b2
Create Date: 2026-08-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d5b2e8c3f9a1"
down_revision: Union[str, Sequence[str], None] = "c4f1a7d9e6b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add admins.display_name, backfilled from full_name."""
    op.add_column(
        "admins",
        sa.Column("display_name", sa.String(length=100), nullable=True),
    )
    op.execute(
        "UPDATE admins SET display_name = full_name "
        "WHERE display_name IS NULL"
    )
    op.alter_column(
        "admins",
        "display_name",
        existing_type=sa.String(length=100),
        nullable=False,
    )


def downgrade() -> None:
    """Downgrade schema: drop admins.display_name."""
    op.drop_column("admins", "display_name")
