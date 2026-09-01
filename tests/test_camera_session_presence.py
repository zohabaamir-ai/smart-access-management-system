"""Cross-device camera recognition-session presence.

The public recognition station (/recognition/camera/{slug}) stamps
``cameras.last_seen_at`` — via a dedicated heartbeat POST and via each
recognition frame. The management app derives ONLINE / OFFLINE from that
timestamp's freshness, so presence works across devices/browsers with no
shared client state. DISABLED stays authoritative. The management
recognition-by-id path and plain camera reads never stamp it.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.core.config import CAMERA_SESSION_TTL_SECONDS
from app.db.db_models.camera import Camera

from tests.helpers import (
    auth_headers,
    blank_jpeg_bytes,
    make_admin,
    make_camera,
)


def _status(client, headers, camera_id: int) -> str:
    rows = client.get("/cameras", headers=headers).json()
    return next(
        r["status"] for r in rows if r["id"] == camera_id
    )


def _reload(db, camera_id: int) -> Camera:
    db.expire_all()
    return (
        db.query(Camera)
        .filter(Camera.id == camera_id)
        .one()
    )


# ---------------------------------------------------------------------------
# 1 + 2 — session starts / stays ONLINE
# ---------------------------------------------------------------------------

def test_public_heartbeat_makes_camera_online(client, db):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(
        db, name="Main Entrance", slug="main-entrance"
    )
    headers = auth_headers(client, "adm")

    # no session yet
    assert _status(client, headers, camera.id) == "offline"

    # unauthenticated public heartbeat
    r = client.post(
        "/recognition/camera/main-entrance/heartbeat"
    )
    assert r.status_code == 200
    assert r.json() == {
        "slug": "main-entrance",
        "status": "online",
    }

    # a *different* client (no shared state) now sees ONLINE
    assert _status(client, headers, camera.id) == "online"


def test_fresh_heartbeats_keep_camera_online(client, db):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="cam-fresh")
    headers = auth_headers(client, "adm")

    for _ in range(3):
        assert (
            client.post(
                "/recognition/camera/cam-fresh/heartbeat"
            ).status_code
            == 200
        )

    assert _status(client, headers, camera.id) == "online"


def test_recognition_frame_also_refreshes_session(client, db):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="cam-frame")
    headers = auth_headers(client, "adm")

    # a blank frame -> no face -> 200, no event, but the station is present
    r = client.post(
        "/recognition/camera/cam-frame",
        files={
            "file": (
                "f.jpg",
                blank_jpeg_bytes(),
                "image/jpeg",
            )
        },
    )
    assert r.status_code == 200
    assert _status(client, headers, camera.id) == "online"


# ---------------------------------------------------------------------------
# 3 — stale heartbeat -> OFFLINE
# ---------------------------------------------------------------------------

def test_stale_session_becomes_offline(client, db):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="cam-stale")
    headers = auth_headers(client, "adm")

    client.post("/recognition/camera/cam-stale/heartbeat")
    assert _status(client, headers, camera.id) == "online"

    # backdate the heartbeat well past the TTL
    row = _reload(db, camera.id)
    row.last_seen_at = datetime.now(
        timezone.utc
    ) - timedelta(
        seconds=CAMERA_SESSION_TTL_SECONDS + 30
    )
    db.commit()

    assert _status(client, headers, camera.id) == "offline"


# ---------------------------------------------------------------------------
# 4 — management preview / by-id recognition must NOT create ONLINE
# ---------------------------------------------------------------------------

def test_management_recognition_by_id_does_not_set_online(
    client, db
):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="cam-byid")
    headers = auth_headers(client, "adm")

    r = client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": str(camera.id)},
        files={
            "file": (
                "f.jpg",
                blank_jpeg_bytes(),
                "image/jpeg",
            )
        },
    )
    assert r.status_code == 200

    assert _reload(db, camera.id).last_seen_at is None
    assert _status(client, headers, camera.id) == "offline"


def test_reading_a_camera_does_not_set_online(client, db):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="cam-read")
    headers = auth_headers(client, "adm")

    # both the management read and the public slug-resolve are read-only
    assert (
        client.get(
            f"/cameras/{camera.id}", headers=headers
        ).status_code
        == 200
    )
    assert (
        client.get(
            "/cameras/slug/cam-read"
        ).status_code
        == 200
    )

    assert _reload(db, camera.id).last_seen_at is None
    assert _status(client, headers, camera.id) == "offline"


# ---------------------------------------------------------------------------
# 5 — DISABLED stays authoritative
# ---------------------------------------------------------------------------

def test_disabled_camera_stays_disabled_even_with_fresh_session(
    client, db
):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="cam-disabled")
    headers = auth_headers(client, "adm")

    # a fresh session on disk
    row = _reload(db, camera.id)
    row.last_seen_at = datetime.now(timezone.utc)
    db.commit()
    assert _status(client, headers, camera.id) == "online"

    # now disable it -> DISABLED wins regardless of the fresh timestamp
    client.patch(
        f"/cameras/{camera.id}",
        headers=headers,
        json={"is_active": False},
    )
    assert _status(client, headers, camera.id) == "disabled"


def test_heartbeat_to_disabled_camera_is_rejected(client, db):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(
        db, slug="cam-off", is_active=False
    )
    headers = auth_headers(client, "adm")

    r = client.post(
        "/recognition/camera/cam-off/heartbeat"
    )
    assert r.status_code == 404
    assert _reload(db, camera.id).last_seen_at is None
    assert _status(client, headers, camera.id) == "disabled"


# ---------------------------------------------------------------------------
# 6 — presence is backend state, independent of any client
# ---------------------------------------------------------------------------

def test_presence_is_backend_state_not_client_state(client, db):
    """The heartbeat carries no auth, no cookie, no body; a wholly
    separate authenticated client reads the resulting ONLINE. Nothing
    is shared between the two callers but the backend row."""
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="cam-xdevice")
    headers = auth_headers(client, "adm")

    client.post(
        "/recognition/camera/cam-xdevice/heartbeat",
        headers={},  # explicitly no credentials
    )

    assert _reload(db, camera.id).last_seen_at is not None
    assert _status(client, headers, camera.id) == "online"


# ---------------------------------------------------------------------------
# 7 — unknown slug
# ---------------------------------------------------------------------------

def test_heartbeat_unknown_slug_404(client, db):
    make_admin(db, username="adm", role="admin")
    r = client.post(
        "/recognition/camera/no-such-camera/heartbeat"
    )
    assert r.status_code == 404
