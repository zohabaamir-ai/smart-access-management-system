"""terminal to camera domain migration

Renames the obsolete Terminal product concept to Camera (V1):

* table ``terminals`` -> ``cameras``
* drops the removed device-pairing columns ``terminal_key``,
  ``camera_status`` (heartbeat-written), ``last_seen`` (heartbeat-written)
* ``recognition_events.terminal_id`` -> ``recognition_events.camera_id``
  (foreign key now references ``cameras.id``)

Data-preserving: uses ``ALTER`` only, never drop/recreate.

Downgrade is structural, not data-faithful: the dropped ``terminal_key``
secret cannot be reconstructed, so downgrade re-adds it as a nullable
column.

Revision ID: f2b7c1a9d4e0
Revises: e1289f3287bc
Create Date: 2026-08-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f2b7c1a9d4e0"
down_revision: Union[str, Sequence[str], None] = "e1289f3287bc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: Terminal -> Camera."""

    # 1. Drop the unique index on the column being removed.
    op.drop_index(
        "ix_terminals_terminal_key",
        table_name="terminals",
    )

    # 2. Rename the table. Postgres re-points dependent foreign keys
    #    (recognition_events.terminal_id) at the new table name.
    op.rename_table("terminals", "cameras")

    # 3. Keep the slug index name aligned with the new table.
    op.execute(
        "ALTER INDEX ix_terminals_slug RENAME TO ix_cameras_slug"
    )

    # 4. Drop the obsolete device-pairing / heartbeat columns.
    op.drop_column("cameras", "terminal_key")
    op.drop_column("cameras", "camera_status")
    op.drop_column("cameras", "last_seen")

    # 5. Rename the recognition-event foreign key column + constraint.
    op.alter_column(
        "recognition_events",
        "terminal_id",
        new_column_name="camera_id",
    )
    op.execute(
        "ALTER TABLE recognition_events "
        "RENAME CONSTRAINT recognition_events_terminal_id_fkey "
        "TO recognition_events_camera_id_fkey"
    )


def downgrade() -> None:
    """Downgrade schema: Camera -> Terminal.

    Structural reversal only. ``terminal_key`` comes back as a nullable
    column because the original per-terminal secret is not recoverable.
    """

    op.execute(
        "ALTER TABLE recognition_events "
        "RENAME CONSTRAINT recognition_events_camera_id_fkey "
        "TO recognition_events_terminal_id_fkey"
    )
    op.alter_column(
        "recognition_events",
        "camera_id",
        new_column_name="terminal_id",
    )

    op.add_column(
        "cameras",
        sa.Column(
            "last_seen",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "cameras",
        sa.Column(
            "camera_status",
            sa.String(length=20),
            nullable=False,
            server_default="disconnected",
        ),
    )
    op.alter_column(
        "cameras",
        "camera_status",
        server_default=None,
    )
    op.add_column(
        "cameras",
        sa.Column(
            "terminal_key",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.execute(
        "ALTER INDEX ix_cameras_slug RENAME TO ix_terminals_slug"
    )
    op.rename_table("cameras", "terminals")

    op.create_index(
        "ix_terminals_terminal_key",
        "terminals",
        ["terminal_key"],
        unique=True,
    )
