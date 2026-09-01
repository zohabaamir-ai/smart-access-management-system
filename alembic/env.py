"""Alembic environment.

Phase 0: migration control only. The database URL is resolved from the
same place the application uses (``DATABASE_URL`` env var), or from an
explicit ``sqlalchemy.url`` set on the Config object (used by the
characterization test to point at a throwaway verification database).
``target_metadata`` is the application's real ``Base.metadata`` so the
baseline revision represents the CURRENT schema exactly.
"""

from __future__ import annotations

import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# --- application metadata -------------------------------------------------
from app.db.db_models.base import Base

# Import every model module so Base.metadata is complete
# (mirrors create_tables.py).
from app.db.db_models import admin as _admin  # noqa: F401
from app.db.db_models import camera as _camera  # noqa: F401
from app.db.db_models import person as _person  # noqa: F401
from app.db.db_models import person_activity as _person_activity  # noqa: F401
from app.db.db_models import recognition_event as _recognition_event  # noqa: F401
from app.db.db_models import system_setting as _system_setting  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _database_url() -> str:
    explicit = config.get_main_option("sqlalchemy.url")
    if explicit and not explicit.startswith("driver://"):
        return explicit

    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url

    return (
        "postgresql://postgres:postgres@localhost:5432/"
        "smart_access_management_system"
    )


def run_migrations_offline() -> None:
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    section = config.get_section(config.config_ini_section) or {}
    section["sqlalchemy.url"] = _database_url()

    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
