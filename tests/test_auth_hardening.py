"""B5 — Authentication hardening.

Covers progressive lockout, atomic failed-attempt counting, the
must_change_password authorization gate, Super Admin protections, and
removal of the public side-effecting lock-status endpoint.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.db.database import SessionLocal
from app.repositories.admin_repository import AdminRepository
from app.services.auth_service import (
    LOCKOUT_DURATIONS_MINUTES,
    lockout_duration_minutes,
)
from tests.helpers import DEFAULT_PASSWORD, make_admin


def _fail_login(client, username, times=5):
    last = None
    for _ in range(times):
        last = client.post(
            "/auth/login",
            json={"username": username, "password": "definitely-wrong"},
        )
    return last


def _reload(db, admin_id):
    db.expire_all()
    return AdminRepository(db).get_by_id(admin_id)


# ---------------------------------------------------------------------------
# progressive lockout
# ---------------------------------------------------------------------------

def test_lockout_duration_policy_is_deterministic():
    assert lockout_duration_minutes(1) == 15
    assert lockout_duration_minutes(2) == 30
    assert lockout_duration_minutes(3) == 60
    assert lockout_duration_minutes(4) == 120
    # capped
    assert lockout_duration_minutes(9) == LOCKOUT_DURATIONS_MINUTES[-1] == 120
    # defensive lower bound
    assert lockout_duration_minutes(0) == 15


@pytest.mark.parametrize(
    "seed_lockout_count, low, high",
    [
        (0, 14, 15),   # first lockout  -> ~15 min
        (1, 29, 30),   # second lockout -> ~30 min
        (2, 59, 60),   # third lockout  -> ~60 min
        (5, 119, 120),  # capped         -> ~120 min
    ],
)
def test_progressive_lockout_increases_duration(
    client, db, seed_lockout_count, low, high
):
    make_admin(
        db,
        username="esc",
        role="operator",
        lockout_count=seed_lockout_count,
        # a previous lock that has already elapsed
        failed_login_attempts=0,
        locked_until=datetime.now(timezone.utc) - timedelta(minutes=1),
    )

    before = datetime.now(timezone.utc)
    response = _fail_login(client, "esc", times=5)
    assert response.status_code == 423

    locked_until = datetime.fromisoformat(
        response.json()["detail"]["locked_until"]
    )
    delta_minutes = (locked_until - before).total_seconds() / 60
    assert low <= delta_minutes <= high + 0.5

    admin = _reload(db, 1)
    assert admin.lockout_count == seed_lockout_count + 1
    # a lockout must never permanently disable the account
    assert admin.is_active is True


def test_temporary_lock_expires_and_login_works_again(client, db):
    make_admin(
        db,
        username="expy",
        role="operator",
        failed_login_attempts=5,
        lockout_count=1,
        locked_until=datetime.now(timezone.utc) - timedelta(seconds=1),
    )

    response = client.post(
        "/auth/login",
        json={"username": "expy", "password": DEFAULT_PASSWORD},
    )
    assert response.status_code == 200

    admin = _reload(db, 1)
    assert admin.failed_login_attempts == 0
    assert admin.locked_until is None
    # a clean login ends the bad streak
    assert admin.lockout_count == 0


def test_successful_login_resets_failed_attempt_state(client, db):
    make_admin(
        db,
        username="reset",
        role="operator",
        failed_login_attempts=3,
        lockout_count=2,
    )

    assert client.post(
        "/auth/login",
        json={"username": "reset", "password": DEFAULT_PASSWORD},
    ).status_code == 200

    admin = _reload(db, 1)
    assert admin.failed_login_attempts == 0
    assert admin.lockout_count == 0
    assert admin.locked_until is None


def test_lockout_never_sets_permanent_disable(client, db):
    make_admin(db, username="perm", role="operator")

    _fail_login(client, "perm", times=12)  # well past the threshold

    admin = _reload(db, 1)
    assert admin.is_active is True
    assert admin.locked_until is not None


# ---------------------------------------------------------------------------
# atomic failed-attempt counter
# ---------------------------------------------------------------------------

def test_failed_attempt_increment_is_atomic(db):
    """Two callers that each read a stale copy of the row and then
    increment must both land — the counter is ``col = col + 1`` in SQL,
    not a read-modify-write that can lose an update."""
    admin = make_admin(db, username="atom", role="operator")

    session_a = SessionLocal()
    session_b = SessionLocal()
    try:
        repo_a = AdminRepository(session_a)
        repo_b = AdminRepository(session_b)

        # both sessions load the row while it still reads 0
        assert repo_a.get_by_id(admin.id).failed_login_attempts == 0
        assert repo_b.get_by_id(admin.id).failed_login_attempts == 0

        assert repo_a.increment_failed_login_attempts(admin.id) == 1
        assert repo_b.increment_failed_login_attempts(admin.id) == 2
    finally:
        session_a.close()
        session_b.close()

    assert _reload(db, admin.id).failed_login_attempts == 2


# ---------------------------------------------------------------------------
# Super Admin
# ---------------------------------------------------------------------------

def test_super_admin_can_be_temporarily_locked(client, db):
    make_admin(db, username="root", role="super_admin")

    response = _fail_login(client, "root", times=5)
    assert response.status_code == 423

    admin = _reload(db, 1)
    assert admin.locked_until is not None
    assert admin.is_active is True
    # brute-force protection must not trigger a forced password change
    assert admin.must_change_password is False


def test_super_admin_not_auto_disabled_by_repeated_lockouts(client, db):
    make_admin(
        db,
        username="root",
        role="super_admin",
        lockout_count=6,
        locked_until=datetime.now(timezone.utc) - timedelta(minutes=1),
    )

    _fail_login(client, "root", times=5)

    admin = _reload(db, 1)
    assert admin.is_active is True
    assert admin.must_change_password is False


# ---------------------------------------------------------------------------
# must_change_password authorization gate
# ---------------------------------------------------------------------------

def _login_token(client, username, password=DEFAULT_PASSWORD):
    response = client.post(
        "/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_must_change_password_blocks_normal_endpoints(client, db):
    make_admin(
        db,
        username="pw",
        role="operator",
        must_change_password=True,
    )
    token = _login_token(client, "pw")
    headers = {"Authorization": f"Bearer {token}"}

    # permission-gated endpoint
    persons = client.get("/persons", headers=headers)
    assert persons.status_code == 403
    assert persons.json()["detail"] == (
        "Password change required before accessing the system."
    )

    # endpoint that only depends on get_current_admin (bare, no permission)
    assert client.patch(
        "/auth/profile", headers=headers, data={"display_name": "Nope"}
    ).status_code == 403
    assert client.get("/dashboard", headers=headers).status_code == 403


def test_must_change_password_allows_password_change_flow(client, db):
    make_admin(
        db,
        username="pw2",
        role="operator",
        must_change_password=True,
    )
    token = _login_token(client, "pw2")
    headers = {"Authorization": f"Bearer {token}"}

    # own profile is reachable so the forced-change screen can render
    assert client.get("/auth/profile", headers=headers).status_code == 200

    changed = client.post(
        "/auth/change-password",
        headers=headers,
        json={
            "current_password": DEFAULT_PASSWORD,
            "new_password": "FreshPass123",
            "confirm_password": "FreshPass123",
        },
    )
    assert changed.status_code == 200

    # the new token no longer carries the gate
    new_headers = {
        "Authorization": f"Bearer {changed.json()['access_token']}"
    }
    assert client.get("/persons", headers=new_headers).status_code == 200


def test_must_change_password_gate_is_server_side_not_frontend(client, db):
    """A perfectly valid bearer token still cannot reach protected
    endpoints while the flag is set — the check is in the auth layer."""
    make_admin(
        db,
        username="pw3",
        role="admin",
        must_change_password=True,
    )
    token = _login_token(client, "pw3")
    headers = {"Authorization": f"Bearer {token}"}

    # admin-only surface, hit directly with a valid token
    assert client.get("/users", headers=headers).status_code == 403
    assert client.get("/cameras", headers=headers).status_code == 403


# ---------------------------------------------------------------------------
# public lock-status behaviour removed
# ---------------------------------------------------------------------------

def test_public_lock_status_endpoint_removed(client, db):
    make_admin(db, username="who", role="operator")
    assert client.get("/auth/lock-status/who").status_code == 404
    assert client.get("/auth/lock-status/does-not-exist").status_code == 404


def test_lock_state_cannot_be_mutated_without_authentication(client, db):
    make_admin(db, username="lockme", role="operator")
    # the only unlock surface is management-only and authenticated
    assert client.patch("/users/1/unlock").status_code == 401
