"""B7 — management profile & Display Name identity model.

Finalized identity model for a management user:

    full_name     original / registered name  (not self-editable)
    username      account credential          (not self-editable here)
    display_name  name shown in the UI header (self-editable)
    profile_image_url  management profile photo (self-editable)
    role          authoritative in the DB     (not self-editable here)
"""

from __future__ import annotations

import psycopg2

from app.repositories.admin_repository import AdminRepository
from tests.helpers import auth_headers, blank_jpeg_bytes, make_admin


def _profile(client, headers):
    response = client.get("/auth/profile", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def _reload(db, admin_id):
    db.expire_all()
    return AdminRepository(db).get_by_id(admin_id)


# ---------------------------------------------------------------------------
# profile fields
# ---------------------------------------------------------------------------

def test_profile_exposes_full_identity_model(client, db):
    make_admin(
        db,
        username="mak",
        role="operator",
        full_name="Muhammad Ali Khan",
        display_name="Ali",
    )
    body = _profile(client, auth_headers(client, "mak"))

    assert body["full_name"] == "Muhammad Ali Khan"   # original name
    assert body["display_name"] == "Ali"              # header name
    assert body["username"] == "mak"                  # credential
    assert body["role"] == "operator"
    assert "profile_image_url" in body


def test_display_name_defaults_to_full_name_for_new_account(client, db):
    make_admin(db, username="nodisplay", full_name="Original Only")
    body = _profile(client, auth_headers(client, "nodisplay"))
    assert body["display_name"] == "Original Only"


# ---------------------------------------------------------------------------
# display name update
# ---------------------------------------------------------------------------

def test_display_name_can_be_updated_and_persisted(client, db):
    make_admin(db, username="up", full_name="Up Original")
    headers = auth_headers(client, "up")

    response = client.patch(
        "/auth/profile",
        headers=headers,
        data={"display_name": "  Uppy  "},
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "Uppy"           # trimmed
    assert _profile(client, headers)["display_name"] == "Uppy"  # persisted


def test_display_name_update_leaves_other_identity_fields_alone(client, db):
    admin = make_admin(
        db, username="stable", role="admin", full_name="Stable Name"
    )
    headers = auth_headers(client, "stable")

    client.patch(
        "/auth/profile", headers=headers, data={"display_name": "Nick"}
    )

    row = _reload(db, admin.id)
    assert row.display_name == "Nick"
    assert row.full_name == "Stable Name"
    assert row.username == "stable"
    assert row.role == "admin"


def test_display_name_update_does_not_touch_token_version(client, db):
    admin = make_admin(db, username="tok", full_name="Tok")
    headers = auth_headers(client, "tok")
    before = _reload(db, admin.id).token_version

    response = client.patch(
        "/auth/profile", headers=headers, data={"display_name": "Tokky"}
    )
    assert response.status_code == 200

    assert _reload(db, admin.id).token_version == before
    # the token minted before the rename is still valid
    assert client.get("/auth/profile", headers=headers).status_code == 200


def test_display_name_response_reflects_the_update(client, db):
    make_admin(db, username="refl", full_name="Reflect Me")
    headers = auth_headers(client, "refl")

    patched = client.patch(
        "/auth/profile", headers=headers, data={"display_name": "Mirror"}
    ).json()
    assert patched["display_name"] == "Mirror"
    assert patched["full_name"] == "Reflect Me"


def test_blank_display_name_rejected(client, db):
    make_admin(db, username="bd", full_name="BD")
    headers = auth_headers(client, "bd")
    response = client.patch(
        "/auth/profile", headers=headers, data={"display_name": "   "}
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Display name is required."}


def test_display_name_too_long_rejected(client, db):
    make_admin(db, username="tl", full_name="TL")
    headers = auth_headers(client, "tl")
    response = client.patch(
        "/auth/profile", headers=headers, data={"display_name": "x" * 101}
    )
    assert response.status_code == 400
    assert response.json() == {
        "detail": "Display name must be 100 characters or less."
    }


def test_profile_update_cannot_change_username_or_role(client, db):
    admin = make_admin(
        db, username="noesc", role="operator", full_name="No Esc"
    )
    headers = auth_headers(client, "noesc")

    response = client.patch(
        "/auth/profile",
        headers=headers,
        data={
            "display_name": "X",
            "username": "hacked",
            "role": "super_admin",
        },
    )
    assert response.status_code == 200

    row = _reload(db, admin.id)
    assert row.username == "noesc"
    assert row.role == "operator"


def test_legacy_full_name_field_updates_display_name_only(client, db):
    admin = make_admin(db, username="legacyfield", full_name="Legacy Field")
    headers = auth_headers(client, "legacyfield")

    response = client.patch(
        "/auth/profile", headers=headers, data={"full_name": "Shown"}
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "Shown"
    assert response.json()["full_name"] == "Legacy Field"
    assert _reload(db, admin.id).full_name == "Legacy Field"


# ---------------------------------------------------------------------------
# profile photo
# ---------------------------------------------------------------------------

def test_profile_photo_can_be_updated(client, db):
    make_admin(db, username="pic", full_name="Pic")
    headers = auth_headers(client, "pic")

    response = client.patch(
        "/auth/profile",
        headers=headers,
        data={"display_name": "Pic"},
        files={"profile_image": ("me.jpg", blank_jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 200
    url = response.json()["profile_image_url"]
    assert url and url.startswith("/uploads/profiles/")
    assert _profile(client, headers)["profile_image_url"] == url


def test_profile_photo_rejects_non_image(client, db):
    make_admin(db, username="badpic", full_name="Bad Pic")
    headers = auth_headers(client, "badpic")

    response = client.patch(
        "/auth/profile",
        headers=headers,
        data={"display_name": "Bad Pic"},
        files={"profile_image": ("x.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Users API representation
# ---------------------------------------------------------------------------

def test_users_list_exposes_display_identity_and_photo(client, db):
    make_admin(db, username="root", role="super_admin", full_name="Root R")
    make_admin(
        db,
        username="member",
        role="operator",
        full_name="Member Original",
        display_name="Mem",
    )
    rows = client.get(
        "/users", headers=auth_headers(client, "root")
    ).json()
    row = next(r for r in rows if r["username"] == "member")

    assert row["full_name"] == "Member Original"
    assert row["display_name"] == "Mem"
    assert row["role"] == "operator"
    assert "profile_image_url" in row
    assert "is_active" in row


def test_users_list_reflects_updated_display_name(client, db):
    make_admin(db, username="root", role="super_admin", full_name="Root")
    member = make_admin(
        db, username="m2", role="operator", full_name="M2 Orig"
    )
    client.patch(
        "/auth/profile",
        headers=auth_headers(client, "m2"),
        data={"display_name": "Deuce"},
    )

    rows = client.get(
        "/users", headers=auth_headers(client, "root")
    ).json()
    row = next(r for r in rows if r["username"] == "m2")
    assert row["display_name"] == "Deuce"
    assert row["full_name"] == "M2 Orig"
    assert member.id == row["id"]


# ---------------------------------------------------------------------------
# separation from Person enrollment photos
# ---------------------------------------------------------------------------

def test_management_profile_photo_is_separate_from_person_enrollment(client, db):
    from app.db.db_models.person import Person

    make_admin(db, username="sep", full_name="Sep")
    headers = auth_headers(client, "sep")

    response = client.patch(
        "/auth/profile",
        headers=headers,
        data={"display_name": "Sep"},
        files={"profile_image": ("a.jpg", blank_jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 200

    # a management profile photo creates no Person / enrollment record
    assert db.query(Person).count() == 0
    # and it is stored under a different path than the Person photo route
    assert response.json()["profile_image_url"].startswith("/uploads/profiles/")


def test_profile_image_service_has_no_recognition_dependency():
    import app.services.profile_image_service as module

    with open(module.__file__, encoding="utf-8") as handle:
        source = handle.read()

    for banned in ("face_model", "FaceModel", "recognition", "embedding"):
        assert banned not in source


# ---------------------------------------------------------------------------
# migration backfill for existing accounts
# ---------------------------------------------------------------------------

def test_migration_backfills_display_name_from_full_name():
    from alembic import command
    from alembic.config import Config

    from tests.conftest import (
        _ADMIN_DSN,
        _PG_HOST,
        _PG_PASSWORD,
        _PG_PORT,
        _PG_USER,
    )

    db_name = "sams_b7_display_name_backfill_check"
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

        # state of the schema immediately BEFORE display_name existed
        command.upgrade(cfg, "c4f1a7d9e6b2")

        conn = psycopg2.connect(url)
        conn.autocommit = True
        conn.cursor().execute(
            "INSERT INTO admins (full_name, username, password_hash, role, "
            "is_active, failed_login_attempts, lockout_count, "
            "must_change_password, token_version, created_at) VALUES "
            "('Legacy Person', 'legacy', 'x', 'operator', true, 0, 0, "
            "false, 0, now())"
        )
        conn.close()

        command.upgrade(cfg, "head")

        conn = psycopg2.connect(url)
        cur = conn.cursor()
        cur.execute(
            "SELECT full_name, display_name FROM admins WHERE username = 'legacy'"
        )
        full_name, display_name = cur.fetchone()
        conn.close()

        assert display_name == full_name == "Legacy Person"
    finally:
        _admin_sql(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = %s AND pid <> pg_backend_pid()",
            (db_name,),
        )
        _admin_sql(f'DROP DATABASE IF EXISTS "{db_name}"')
