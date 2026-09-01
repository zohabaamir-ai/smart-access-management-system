"""Verify the Alembic baseline reproduces the CURRENT schema.

Runs ``alembic upgrade head`` on a throwaway database and asserts the
resulting structure is identical to ``Base.metadata.create_all`` (tables,
columns + types + nullability, primary keys, foreign keys incl. ondelete,
unique constraints, indexes). No developer database is touched.
"""

from __future__ import annotations

import psycopg2
import pytest
from sqlalchemy import create_engine, inspect

from tests.conftest import _ADMIN_DSN, _PG_HOST, _PG_PASSWORD, _PG_PORT, _PG_USER

_UPGRADE_DB = "smart_access_management_system_alembic_upgrade_check"
_CREATE_ALL_DB = "smart_access_management_system_ddl_ref_check"


def _url(db: str) -> str:
    return (
        f"postgresql://{_PG_USER}:{_PG_PASSWORD}@{_PG_HOST}:{_PG_PORT}/{db}"
    )


def _recreate(db: str) -> None:
    conn = psycopg2.connect(_ADMIN_DSN)
    conn.autocommit = True
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = %s AND pid <> pg_backend_pid()",
            (db,),
        )
        cur.execute(f'DROP DATABASE IF EXISTS "{db}"')
        cur.execute(f'CREATE DATABASE "{db}"')
    finally:
        conn.close()


def _drop(db: str) -> None:
    conn = psycopg2.connect(_ADMIN_DSN)
    conn.autocommit = True
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = %s AND pid <> pg_backend_pid()",
            (db,),
        )
        cur.execute(f'DROP DATABASE IF EXISTS "{db}"')
    finally:
        conn.close()


def _schema_snapshot(engine) -> dict:
    insp = inspect(engine)
    snapshot: dict = {}
    for table in sorted(insp.get_table_names()):
        if table == "alembic_version":
            continue
        snapshot[table] = {
            "columns": {
                col["name"]: (str(col["type"]), col["nullable"])
                for col in insp.get_columns(table)
            },
            "pk": tuple(
                insp.get_pk_constraint(table)["constrained_columns"]
            ),
            "fks": sorted(
                (
                    tuple(fk["constrained_columns"]),
                    fk["referred_table"],
                    tuple(fk["referred_columns"]),
                    (fk.get("options") or {}).get("ondelete"),
                )
                for fk in insp.get_foreign_keys(table)
            ),
            "unique": sorted(
                tuple(u["column_names"])
                for u in insp.get_unique_constraints(table)
            ),
            "indexes": sorted(
                (tuple(i["column_names"]), i["unique"])
                for i in insp.get_indexes(table)
            ),
        }
    return snapshot


@pytest.fixture
def _verification_databases():
    _recreate(_UPGRADE_DB)
    _recreate(_CREATE_ALL_DB)
    try:
        yield
    finally:
        _drop(_UPGRADE_DB)
        _drop(_CREATE_ALL_DB)


def test_alembic_upgrade_head_reproduces_current_schema(
    _verification_databases,
):
    from alembic import command
    from alembic.config import Config

    from app.db.db_models.base import Base

    # 1. alembic upgrade head on a fresh DB
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", _url(_UPGRADE_DB))
    command.upgrade(cfg, "head")

    # 2. create_all on another fresh DB
    ref_engine = create_engine(_url(_CREATE_ALL_DB))
    Base.metadata.create_all(ref_engine)

    # 3. structural comparison
    upgrade_engine = create_engine(_url(_UPGRADE_DB))
    upgraded = _schema_snapshot(upgrade_engine)
    reference = _schema_snapshot(ref_engine)

    upgrade_engine.dispose()
    ref_engine.dispose()

    assert set(upgraded) == {
        "admins",
        "cameras",
        "person_activities",
        "persons",
        "recognition_events",
        "system_settings",
    }
    assert upgraded == reference


def test_single_baseline_revision_and_linear_history():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    script = ScriptDirectory.from_config(Config("alembic.ini"))
    revisions = list(script.walk_revisions())

    # Exactly one root (the baseline); every other revision has a parent.
    roots = [r for r in revisions if r.down_revision is None]
    assert len(roots) == 1

    # Linear history: a single head.
    assert len(script.get_heads()) == 1
