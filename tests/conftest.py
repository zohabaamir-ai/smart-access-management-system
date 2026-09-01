"""Phase 0 characterization-test harness.

Isolation strategy
------------------
The application builds its SQLAlchemy engine at import time from
``os.getenv("DATABASE_URL", <hard-coded dev DSN>)``.  This module sets
``DATABASE_URL`` to a **dedicated ``*_test`` database BEFORE importing the
app**, creates that database if it does not exist, and then asserts that
the live engine is really pointed at a ``_test`` DB.  If that assertion
fails the whole suite errors out — the developer's database is never
touched.

No application source is imported until the environment is prepared.
"""

from __future__ import annotations

import os

import psycopg2
import pytest

# ---------------------------------------------------------------------------
# 1. Environment — must be set before any `app` / `main` import.
# ---------------------------------------------------------------------------

_PG_HOST = os.getenv("TEST_PG_HOST", "localhost")
_PG_PORT = os.getenv("TEST_PG_PORT", "5432")
_PG_USER = os.getenv("TEST_PG_USER", "postgres")
_PG_PASSWORD = os.getenv("TEST_PG_PASSWORD", "postgres")

TEST_DB_NAME = os.getenv(
    "TEST_DB_NAME", "smart_access_management_system_test"
)

_ADMIN_DSN = (
    f"postgresql://{_PG_USER}:{_PG_PASSWORD}@{_PG_HOST}:{_PG_PORT}/postgres"
)
TEST_DATABASE_URL = (
    f"postgresql://{_PG_USER}:{_PG_PASSWORD}"
    f"@{_PG_HOST}:{_PG_PORT}/{TEST_DB_NAME}"
)

# Point the application at the test database.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

# The app requires these at import time (auth_service raises RuntimeError
# without a secret). Use explicit test values so the suite does not depend
# on the developer's .env.
os.environ.setdefault(
    "JWT_SECRET_KEY",
    "phase0-characterization-secret-key-not-for-production-use",
)
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")


def _ensure_database(name: str) -> None:
    conn = psycopg2.connect(_ADMIN_DSN)
    conn.autocommit = True
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (name,)
        )
        if cur.fetchone() is None:
            cur.execute(f'CREATE DATABASE "{name}"')
    finally:
        conn.close()


_ensure_database(TEST_DB_NAME)

# ---------------------------------------------------------------------------
# 2. Now it is safe to import the application.
# ---------------------------------------------------------------------------

import main  # noqa: E402
from app.db.database import SessionLocal, engine  # noqa: E402
from app.db.db_models.base import Base  # noqa: E402

# Import every model so Base.metadata is complete (mirrors create_tables.py).
from app.db.db_models import admin as _m_admin  # noqa: E402,F401
from app.db.db_models import camera as _m_camera  # noqa: E402,F401
from app.db.db_models import person as _m_person  # noqa: E402,F401
from app.db.db_models import person_activity as _m_activity  # noqa: E402,F401
from app.db.db_models import recognition_event as _m_event  # noqa: E402,F401
from app.db.db_models import system_setting as _m_setting  # noqa: E402,F401

# Hard safety gate: never run against a non-test database.
assert "_test" in str(engine.url), (
    f"Refusing to run the test suite: the application engine is not "
    f"pointed at a *_test database (got {engine.url!r})."
)


# ---------------------------------------------------------------------------
# 3. Schema + per-test data isolation.
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def _schema():
    """Create the schema once for the session via the app's own metadata.

    Phase 0 uses ``create_all`` here for a fast, dependency-free schema.
    ``alembic upgrade head`` is verified independently by
    ``tests/test_alembic_baseline.py``.
    """
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _clean_tables():
    """Truncate every table before each test for full isolation."""
    table_list = ", ".join(
        f'"{t.name}"' for t in Base.metadata.sorted_tables
    )
    with engine.begin() as conn:
        conn.exec_driver_sql(
            f"TRUNCATE {table_list} RESTART IDENTITY CASCADE"
        )
    yield


# ---------------------------------------------------------------------------
# 4. Fixtures.
# ---------------------------------------------------------------------------

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="session")
def app_client():
    """Session-scoped TestClient (the FaceModel load is expensive)."""
    from starlette.testclient import TestClient

    with TestClient(main.app) as client:
        yield client


@pytest.fixture
def client(app_client):
    return app_client


# --- seeded accounts -------------------------------------------------------

@pytest.fixture
def super_admin(db):
    from tests.helpers import make_admin

    return make_admin(db, username="root", role="super_admin")


@pytest.fixture
def admin_user(db):
    from tests.helpers import make_admin

    return make_admin(db, username="adm", role="admin")


@pytest.fixture
def operator_user(db):
    from tests.helpers import make_admin

    return make_admin(db, username="op", role="operator")


@pytest.fixture
def fastapi_app():
    return main.app
