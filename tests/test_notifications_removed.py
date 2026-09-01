"""B10 — the pre-V1 Notification subsystem is removed (STATE A).

Recognition -> Recognition Event -> Activity, with no persistent
notification infrastructure anywhere.
"""

from __future__ import annotations

import importlib

import psycopg2
import pytest
import torch

from app.api import deps
from app.core.permissions import Permission
from app.db.db_models.person_activity import PersonActivity
from app.db.db_models.recognition_event import RecognitionEvent
from app.models.face_model import DetectedFace
from tests.helpers import (
    EMBEDDING_DIM,
    auth_headers,
    blank_jpeg_bytes,
    make_admin,
    make_camera,
    make_person,
)


# ---------------------------------------------------------------------------
# routes gone
# ---------------------------------------------------------------------------

_NOTIFICATION_CALLS = [
    ("get", "/notifications"),
    ("get", "/notifications/unread-count"),
    ("patch", "/notifications/1/read"),
    ("patch", "/notifications/read-all"),
    ("delete", "/notifications/1"),
    ("delete", "/notifications"),
]


@pytest.mark.parametrize("method,path", _NOTIFICATION_CALLS)
def test_notification_routes_are_gone(client, db, method, path):
    make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "op")
    response = getattr(client, method)(path, headers=headers)
    assert response.status_code == 404


def test_no_notifications_prefix_in_openapi(client):
    paths = client.app.openapi()["paths"]
    assert not any(p.startswith("/notifications") for p in paths)
    prefixes = sorted({p.split("/")[1] for p in paths})
    assert "notifications" not in prefixes


def test_no_notification_permissions_exist():
    for member in Permission:
        assert "notif" not in member.value.lower()
        assert "NOTIF" not in member.name


# ---------------------------------------------------------------------------
# no orphan code
# ---------------------------------------------------------------------------

def test_notification_modules_are_deleted():
    for dotted in (
        "app.db.db_models.notification",
        "app.repositories.notification_repository",
        "app.services.notification_service",
        "app.schemas.notification_schemas",
        "app.api.routes.notification_routes",
    ):
        with pytest.raises(ModuleNotFoundError):
            importlib.import_module(dotted)


def test_recognition_and_enrollment_services_have_no_notification_dependency():
    from app.services import enrollment_service, recognition_service

    rec_src = open(recognition_service.__file__, encoding="utf-8").read()
    enr_src = open(enrollment_service.__file__, encoding="utf-8").read()
    for src in (rec_src, enr_src):
        assert "NotificationService" not in src
        assert "notification_service" not in src
        assert "create_recognition_notification" not in src
        assert "create_person_registered_notification" not in src

    assert not hasattr(deps, "get_notification_service")
    assert "get_notification_service" not in deps.__all__


# ---------------------------------------------------------------------------
# recognition: event + Activity intact, nothing else created
# ---------------------------------------------------------------------------

def _stub_one_face(distance: float):
    def _get_faces(_image):
        vec = [0.0] * EMBEDDING_DIM
        vec[0] = distance
        return [
            DetectedFace(
                embedding=torch.tensor(vec, dtype=torch.float32),
                box=(0.0, 0.0, 1.0, 1.0),
            )
        ]

    return _get_faces


def test_successful_recognition_creates_event_and_no_notification(
    client, db, monkeypatch
):
    make_admin(db, username="op", role="operator")
    person = make_person(db, identifier="55555-5555555-5")
    camera = make_camera(db, slug="b10-rec")
    headers = auth_headers(client, "op")
    monkeypatch.setattr(deps.face_model, "get_faces", _stub_one_face(0.1))

    before = db.query(RecognitionEvent).count()
    response = client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": str(camera.id)},
        files={"file": ("f.jpg", blank_jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 200
    assert response.json()["results"][0]["matched"] is True

    db.expire_all()
    assert db.query(RecognitionEvent).count() == before + 1

    # the event surfaces in Activity, unchanged
    activity = client.get("/activity", headers=headers).json()
    assert any(row["person_id"] == person.id for row in activity)

    # there is no longer a notifications table in the ORM metadata
    assert "notifications" not in RecognitionEvent.__table__.metadata.tables


def test_enrollment_still_writes_person_activity_and_no_notification(
    client, db, monkeypatch
):
    make_admin(db, username="op", role="operator")
    make_person(db, identifier="10000-0000000-9")  # an existing zeros face
    headers = auth_headers(client, "op")

    # a face far from any enrolled person -> not a duplicate -> enrolls
    monkeypatch.setattr(deps.face_model, "get_faces", _stub_one_face(1.5))
    ok = client.post(
        "/persons/enroll",
        headers=headers,
        data={"name": "Enrolled Person", "identifier": "56565-6565656-6"},
        files={"file": ("p.jpg", blank_jpeg_bytes(), "image/jpeg")},
    )
    assert ok.status_code == 200, ok.text

    pid = ok.json()["person_id"]
    assert (
        db.query(PersonActivity)
        .filter(
            PersonActivity.person_id == pid,
            PersonActivity.action == "registered",
        )
        .count()
        == 1
    )


# ---------------------------------------------------------------------------
# neighbouring subsystems intact
# ---------------------------------------------------------------------------

def test_auth_users_and_settings_unaffected(client, db):
    make_admin(db, username="root", role="super_admin")
    root = auth_headers(client, "root")

    assert client.get("/auth/profile", headers=root).status_code == 200
    assert client.post(
        "/users",
        headers=root,
        json={"full_name": "N", "username": "n", "role": "operator"},
    ).status_code == 200
    assert client.get("/settings/system", headers=root).status_code == 200
    assert client.get("/activity", headers=root).status_code == 200


# ---------------------------------------------------------------------------
# migration: table dropped, downgrade restores it, re-upgrade drops again
# ---------------------------------------------------------------------------

def test_migration_drops_and_restores_notifications_table():
    from alembic import command
    from alembic.config import Config

    from tests.conftest import (
        _ADMIN_DSN,
        _PG_HOST,
        _PG_PASSWORD,
        _PG_PORT,
        _PG_USER,
    )

    db_name = "sams_b10_drop_notifications_check"
    url = (
        f"postgresql://{_PG_USER}:{_PG_PASSWORD}"
        f"@{_PG_HOST}:{_PG_PORT}/{db_name}"
    )

    def _admin_sql(sql, params=None):
        conn = psycopg2.connect(_ADMIN_DSN)
        conn.autocommit = True
        try:
            conn.cursor().execute(sql, params)
        finally:
            conn.close()

    def _has_table(name):
        conn = psycopg2.connect(url)
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_name = %s",
                (name,),
            )
            return cur.fetchone() is not None
        finally:
            conn.close()

    def _columns(name):
        conn = psycopg2.connect(url)
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = %s ORDER BY column_name",
                (name,),
            )
            return {row[0] for row in cur.fetchall()}
        finally:
            conn.close()

    _admin_sql(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
        "WHERE datname = %s AND pid <> pg_backend_pid()",
        (db_name,),
    )
    _admin_sql(f'DROP DATABASE IF EXISTS "{db_name}"')
    _admin_sql(f'CREATE DATABASE "{db_name}"')

    try:
        cfg = Config("alembic.ini")
        cfg.set_main_option("sqlalchemy.url", url)

        command.upgrade(cfg, "head")
        assert _has_table("notifications") is False

        # Step back to just before drop_notifications (e7c3a1f5d9b8).
        # Named explicitly rather than "-1" so later migrations added
        # on top of head do not shift the target.
        command.downgrade(cfg, "d5b2e8c3f9a1")
        assert _has_table("notifications") is True
        assert _columns("notifications") == {
            "id",
            "type",
            "title",
            "message",
            "severity",
            "is_read",
            "created_at",
            "related_person_id",
        }

        command.upgrade(cfg, "head")
        assert _has_table("notifications") is False
    finally:
        _admin_sql(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = %s AND pid <> pg_backend_pid()",
            (db_name,),
        )
        _admin_sql(f'DROP DATABASE IF EXISTS "{db_name}"')
