"""B9 — System Settings catalog + runtime configuration.

The two V1 settings are recognition / enrollment thresholds. This suite
proves that a persisted value is validated, stored with audit info, and
actually consumed by recognition and enrollment on the very next request
(no restart), while defaults reproduce the pre-B9 hard-coded behaviour.
"""

from __future__ import annotations

import torch

from app.api import deps
from app.core.config import (
    DUPLICATE_FACE_THRESHOLD,
    RECOGNITION_THRESHOLD,
)
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
# helpers
# ---------------------------------------------------------------------------

def _face_at_distance(distance: float):
    """An embedding whose Euclidean distance from the all-zeros embedding
    stored by make_person is exactly ``distance``."""
    vec = [0.0] * EMBEDDING_DIM
    vec[0] = distance
    return torch.tensor(vec, dtype=torch.float32)


def _stub_one_face(distance: float):
    def _get_faces(_image):
        return [
            DetectedFace(
                embedding=_face_at_distance(distance),
                box=(0.0, 0.0, 1.0, 1.0),
            )
        ]

    return _get_faces


def _recognize(client, headers, camera_id):
    return client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": str(camera_id)},
        files={"file": ("frame.jpg", blank_jpeg_bytes(), "image/jpeg")},
    )


def _enroll(client, headers, *, identifier):
    return client.post(
        "/persons/enroll",
        headers=headers,
        data={"name": "Runtime Person", "identifier": identifier},
        files={"file": ("p.jpg", blank_jpeg_bytes(), "image/jpeg")},
    )


def _put_settings(client, headers, settings):
    return client.put(
        "/settings/system", headers=headers, json={"settings": settings}
    )


def _get_settings(client, headers):
    return client.get("/settings/system", headers=headers).json()["settings"]


# ===========================================================================
# ACCESS
# ===========================================================================

def test_super_admin_can_read_and_update(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    assert client.get("/settings/system", headers=headers).status_code == 200
    assert _put_settings(
        client, headers, {"recognition_match_threshold": 0.9}
    ).status_code == 200


def test_admin_and_operator_and_anon_cannot_update(client, db):
    make_admin(db, username="adm", role="admin")
    make_admin(db, username="op", role="operator")

    assert _put_settings(
        client, auth_headers(client, "adm"),
        {"recognition_match_threshold": 0.9},
    ).status_code == 403
    assert _put_settings(
        client, auth_headers(client, "op"),
        {"recognition_match_threshold": 0.9},
    ).status_code == 403
    assert client.put(
        "/settings/system",
        json={"settings": {"recognition_match_threshold": 0.9}},
    ).status_code == 401


# ===========================================================================
# VALIDATION
# ===========================================================================

def test_valid_thresholds_accepted(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    response = _put_settings(
        client, headers,
        {
            "recognition_match_threshold": 1.2,
            "duplicate_face_match_threshold": 0.6,
        },
    )
    assert response.status_code == 200
    settings = response.json()["settings"]
    assert settings["recognition_match_threshold"]["value"] == 1.2
    assert settings["duplicate_face_match_threshold"]["value"] == 0.6


def test_out_of_range_rejected(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    assert _put_settings(
        client, headers, {"recognition_match_threshold": 5.0}
    ).status_code == 400
    assert _put_settings(
        client, headers, {"duplicate_face_match_threshold": 0.01}
    ).status_code == 400


def test_negative_rejected(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    assert _put_settings(
        client, headers, {"recognition_match_threshold": -1}
    ).status_code == 400


def test_non_numeric_rejected(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    assert _put_settings(
        client, headers, {"recognition_match_threshold": "not-a-number"}
    ).status_code == 400


def test_nan_and_infinity_rejected(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    for bad in ("nan", "inf", "-inf", "Infinity"):
        assert _put_settings(
            client, headers, {"recognition_match_threshold": bad}
        ).status_code == 400, bad


def test_unknown_key_rejected(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    response = _put_settings(
        client, headers, {"made_up_setting": 1, "updated_by": 9},
    )
    assert response.status_code == 400
    assert "Unknown system setting" in response.json()["detail"]


def test_removed_auth_keys_are_no_longer_settings(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    for gone in (
        "max_failed_login_attempts",
        "temporary_lock_minutes",
        "access_token_expire_minutes",
    ):
        assert _put_settings(
            client, headers, {gone: 10}
        ).status_code == 400
    assert set(_get_settings(client, headers)) == {
        "recognition_match_threshold",
        "duplicate_face_match_threshold",
    }


def test_invalid_multi_setting_request_is_all_or_nothing(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")

    response = _put_settings(
        client, headers,
        {
            "recognition_match_threshold": 0.9,   # valid
            "duplicate_face_match_threshold": 99,  # invalid
        },
    )
    assert response.status_code == 400

    # the valid half must NOT have been written
    entry = _get_settings(client, headers)["recognition_match_threshold"]
    assert entry["value"] == RECOGNITION_THRESHOLD
    assert entry["updated_at"] is None


# ===========================================================================
# PERSISTENCE / AUDIT
# ===========================================================================

def test_update_persists_and_get_returns_it_with_audit(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")

    _put_settings(client, headers, {"recognition_match_threshold": 0.85})

    entry = _get_settings(client, headers)["recognition_match_threshold"]
    assert entry["value"] == 0.85
    assert entry["updated_at"] is not None
    assert entry["updated_by"] == 1   # the sole Super Admin (id 1)


def test_second_update_leaves_the_other_setting_untouched(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")

    _put_settings(client, headers, {"recognition_match_threshold": 0.8})
    _put_settings(client, headers, {"duplicate_face_match_threshold": 0.5})

    settings = _get_settings(client, headers)
    assert settings["recognition_match_threshold"]["value"] == 0.8
    assert settings["duplicate_face_match_threshold"]["value"] == 0.5


def test_updated_at_advances_on_rewrite(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")

    _put_settings(client, headers, {"recognition_match_threshold": 0.8})
    first = _get_settings(client, headers)["recognition_match_threshold"][
        "updated_at"
    ]
    _put_settings(client, headers, {"recognition_match_threshold": 0.9})
    second = _get_settings(client, headers)["recognition_match_threshold"][
        "updated_at"
    ]
    assert second >= first
    assert (
        _get_settings(client, headers)["recognition_match_threshold"]["value"]
        == 0.9
    )


# ===========================================================================
# DEFAULTS  (pre-B9 behaviour preserved)
# ===========================================================================

def test_defaults_match_pre_b9_constants(client, db):
    make_admin(db, username="root", role="super_admin")
    settings = _get_settings(client, auth_headers(client, "root"))
    assert settings["recognition_match_threshold"]["value"] == RECOGNITION_THRESHOLD
    assert settings["recognition_match_threshold"]["default"] == RECOGNITION_THRESHOLD
    assert (
        settings["duplicate_face_match_threshold"]["value"]
        == DUPLICATE_FACE_THRESHOLD
    )
    assert settings["recognition_match_threshold"]["updated_at"] is None


# ===========================================================================
# RUNTIME BEHAVIOUR — recognition
# ===========================================================================

def test_recognition_uses_default_threshold_when_unset(client, db, monkeypatch):
    make_admin(db, username="op", role="operator")
    make_person(db, identifier="90000-0000000-1")   # embedding = zeros
    camera = make_camera(db, slug="rt-default")
    headers = auth_headers(client, "op")

    # distance 0.9 < default 1.0 -> match
    monkeypatch.setattr(deps.face_model, "get_faces", _stub_one_face(0.9))
    body = _recognize(client, headers, camera.id).json()
    assert body["results"][0]["matched"] is True

    # distance 1.5 > default 1.0 -> no match
    monkeypatch.setattr(deps.face_model, "get_faces", _stub_one_face(1.5))
    body = _recognize(client, headers, camera.id).json()
    assert body["results"][0]["matched"] is False


def test_changing_recognition_threshold_changes_behaviour_without_restart(
    client, db, monkeypatch
):
    make_admin(db, username="root", role="super_admin")
    make_admin(db, username="op", role="operator")
    make_person(db, identifier="90000-0000000-2")
    camera = make_camera(db, slug="rt-change")
    op_headers = auth_headers(client, "op")
    root_headers = auth_headers(client, "root")

    monkeypatch.setattr(deps.face_model, "get_faces", _stub_one_face(0.9))

    # default 1.0 -> 0.9 matches
    assert _recognize(client, op_headers, camera.id).json()["results"][0][
        "matched"
    ] is True

    # tighten to 0.5 -> same 0.9 face no longer matches, immediately
    assert _put_settings(
        client, root_headers, {"recognition_match_threshold": 0.5}
    ).status_code == 200
    assert _recognize(client, op_headers, camera.id).json()["results"][0][
        "matched"
    ] is False

    # loosen back to 1.5 -> matches again
    assert _put_settings(
        client, root_headers, {"recognition_match_threshold": 1.5}
    ).status_code == 200
    assert _recognize(client, op_headers, camera.id).json()["results"][0][
        "matched"
    ] is True


def test_changing_threshold_does_not_touch_person_or_event_data(
    client, db, monkeypatch
):
    from app.db.db_models.person import Person
    from app.db.db_models.recognition_event import RecognitionEvent

    make_admin(db, username="root", role="super_admin")
    make_admin(db, username="op", role="operator")
    person = make_person(db, identifier="90000-0000000-3")
    camera = make_camera(db, slug="rt-nomut")
    op_headers = auth_headers(client, "op")

    monkeypatch.setattr(deps.face_model, "get_faces", _stub_one_face(0.2))
    _recognize(client, op_headers, camera.id)
    events_before = db.query(RecognitionEvent).count()
    embedding_before = list(db.get(Person, person.id).embedding)

    _put_settings(
        client, auth_headers(client, "root"),
        {"recognition_match_threshold": 0.15},
    )

    db.expire_all()
    assert db.query(RecognitionEvent).count() == events_before
    assert list(db.get(Person, person.id).embedding) == embedding_before


# ===========================================================================
# RUNTIME BEHAVIOUR — enrollment duplicate-face detection
# ===========================================================================

def test_enrollment_duplicate_check_uses_default_threshold(
    client, db, monkeypatch
):
    make_admin(db, username="op", role="operator")
    make_person(db, identifier="91000-0000000-1")   # embedding = zeros
    headers = auth_headers(client, "op")

    # distance 0.6 <= default 0.75 -> treated as duplicate -> rejected
    monkeypatch.setattr(deps.face_model, "get_faces", _stub_one_face(0.6))
    response = _enroll(client, headers, identifier="91000-0000000-2")
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_changing_duplicate_threshold_changes_enrollment_outcome(
    client, db, monkeypatch
):
    make_admin(db, username="root", role="super_admin")
    make_admin(db, username="op", role="operator")
    make_person(db, identifier="91000-0000000-3")
    op_headers = auth_headers(client, "op")
    root_headers = auth_headers(client, "root")

    monkeypatch.setattr(deps.face_model, "get_faces", _stub_one_face(0.6))

    # default 0.75 -> 0.6 is a duplicate -> rejected
    assert _enroll(
        client, op_headers, identifier="91000-0000000-4"
    ).status_code == 400

    # loosen to 0.5 -> 0.6 is no longer a duplicate -> enrollment succeeds
    assert _put_settings(
        client, root_headers, {"duplicate_face_match_threshold": 0.5}
    ).status_code == 200
    ok = _enroll(client, op_headers, identifier="91000-0000000-5")
    assert ok.status_code in (200, 201), ok.text


# ===========================================================================
# SECURITY — no bypass, server owns the catalog
# ===========================================================================

def test_non_super_admin_cannot_bypass_via_direct_calls(client, db):
    make_admin(db, username="adm", role="admin")
    make_admin(db, username="op", role="operator")

    for username in ("adm", "op"):
        headers = auth_headers(client, username)
        assert client.get(
            "/settings/system", headers=headers
        ).status_code == 403
        assert client.put(
            "/settings/system",
            headers=headers,
            json={"settings": {"recognition_match_threshold": 0.5}},
        ).status_code == 403


def test_client_cannot_set_updated_by(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")

    # updated_by is not a catalog key -> rejected outright
    assert _put_settings(
        client, headers,
        {"recognition_match_threshold": 0.9, "updated_by": 999},
    ).status_code == 400

    # a clean update records the acting Super Admin, never a client value
    _put_settings(client, headers, {"recognition_match_threshold": 0.9})
    entry = _get_settings(client, headers)["recognition_match_threshold"]
    assert entry["updated_by"] == 1
