"""admin token_version

Token-lifecycle control (B6): a per-admin integer that every access token
is minted with. When it no longer matches the column, the token is
rejected — so a password change / administrative reset (which bumps this
value) invalidates all previously issued tokens. No blacklist, no session
table.

Existing rows get ``0``. The column is NOT NULL; a temporary
server_default backfills existing rows, then it is dropped so the stored
schema matches the model (application default only).

Revision ID: c4f1a7d9e6b2
Revises: b8e4f2a6c1d3
Create Date: 2026-08-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4f1a7d9e6b2"
down_revision: Union[str, Sequence[str], None] = "b8e4f2a6c1d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add admins.token_version (default 0)."""
    op.add_column(
        "admins",
        sa.Column(
            "token_version",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.alter_column("admins", "token_version", server_default=None)


def downgrade() -> None:
    """Downgrade schema: drop admins.token_version."""
    op.drop_column("admins", "token_version")
