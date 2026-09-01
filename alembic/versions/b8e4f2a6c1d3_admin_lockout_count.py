"""admin lockout_count

Progressive failed-login lockout (B5) needs to remember how many temporary
lockouts an account has accrued in its current bad streak so each lockout
can last longer than the previous one. Add ``admins.lockout_count``.

Existing rows get ``0`` (no streak). The column is NOT NULL; the temporary
server_default backfills existing rows, then it is dropped so the stored
schema matches the model (application default only).

Revision ID: b8e4f2a6c1d3
Revises: a3d7e9c1b204
Create Date: 2026-08-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b8e4f2a6c1d3"
down_revision: Union[str, Sequence[str], None] = "a3d7e9c1b204"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add admins.lockout_count (default 0)."""
    op.add_column(
        "admins",
        sa.Column(
            "lockout_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.alter_column("admins", "lockout_count", server_default=None)


def downgrade() -> None:
    """Downgrade schema: drop admins.lockout_count."""
    op.drop_column("admins", "lockout_count")
