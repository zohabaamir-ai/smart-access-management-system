"""B3: recognition unification.

Both HTTP entry points

    POST /recognition               (management, explicit camera_id)
    POST /recognition/camera/{slug} (dedicated public Camera URL)

resolve an explicit Camera and then call the one canonical operation
``RecognitionService.recognize_faces(image, camera_id)``, which is the
single point at which a Recognition Event is created.
"""

from __future__ import annotations

import torch

from app.api import deps
from app.db.db_models.recognition_event import RecognitionEvent
from app.models.face_model import DetectedFace
from app.schemas.recognition_schemas import RecognitionResponse
from app.services.recognition_service import RecognitionService
from tests.helpers import (
    EMBEDDING_DIM,
    NOT_AN_IMAGE,
    auth_headers,
    blank_jpeg_bytes,
    make_admin,
    make_camera,
    make_person,
)

# make_person stores an all-zeros embedding; an all-zeros detected face
# therefore has distance 0 (<= RECOGNITION_THRESHOLD) -> a match.
_MATCH_EMB = [0.0] * EMBEDDING_DIM
# ~203 away from any all-zeros enrolled person -> no match.
_NOMATCH_EMB = [9.0] * EMBEDDING_DIM


def _stub_faces(*embeddings):
    """Build a FaceModel.get_faces replacement returning one DetectedFace
    per supplied embedding (0 = no face, 2+ = multiple faces)."""

    def _get_faces(_image):
        return [
            DetectedFace(
                embedding=torch.tensor(e, dtype=torch.float32),
                box=(0.0, 0.0, 1.0, 1.0),
            )
            for e in embeddings
        ]

    return _get_faces


def _file():
    return {"file": ("frame.jpg", blank_jpeg_bytes(), "image/jpeg")}


def _event_count(db):
    return db.query(RecognitionEvent).count()


# ---------------------------------------------------------------------------
# DI wiring
# ---------------------------------------------------------------------------

def test_recognition_service_wiring(client):
    from app.db.database import SessionLocal
    from app.repositories.person_repository import PersonRepository
    from app.repositories.recognition_event_repository import (
        RecognitionEventRepository,
    )
    from app.services.system_setting_service import SystemSettingService

    session = SessionLocal()
    try:
        service = deps.get_recognition_service(db=session)
    finally:
        session.close()

    assert isinstance(service.person_repository, PersonRepository)
    assert isinstance(
        service.recognition_event_repository, RecognitionEventRepository
    )
    assert isinstance(
        service.system_setting_service, SystemSettingService
    )
    assert not hasattr(service, "notification_service")
    assert service.face_model is deps.face_model


# ---------------------------------------------------------------------------
# Management entry point — access boundary + input
# ---------------------------------------------------------------------------

def test_management_recognition_requires_auth(client, db):
    make_camera(db, slug="m-auth")
    response = client.post(
        "/recognition",
        data={"camera_id": "1"},
        files=_file(),
    )
    assert response.status_code == 401


def test_management_recognition_requires_camera_id(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")
    response = client.post("/recognition", headers=headers, files=_file())
    assert response.status_code == 422


def test_management_recognition_unknown_camera_is_404(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")
    response = client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": "9999"},
        files=_file(),
    )
    assert response.status_code == 404
    assert _event_count(db) == 0


def test_management_recognition_disabled_camera_is_rejected(client, db):
    """B3 #10."""
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="m-disabled", is_active=False)
    headers = auth_headers(client, "adm")

    response = client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": str(camera.id)},
        files=_file(),
    )
    assert response.status_code == 404
    assert _event_count(db) == 0


def test_management_recognition_invalid_image_is_400(client, db):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="m-badimg")
    headers = auth_headers(client, "adm")

    response = client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": str(camera.id)},
        files={"file": ("x.txt", NOT_AN_IMAGE, "text/plain")},
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid image file."}


def test_management_recognition_available_to_operator(client, db):
    """V1 §9: Operators may use recognition interfaces."""
    make_admin(db, username="op", role="operator")
    camera = make_camera(db, slug="m-op")
    headers = auth_headers(client, "op")

    response = client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": str(camera.id)},
        files=_file(),
    )
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Management entry point — recognition outcomes
# ---------------------------------------------------------------------------

def test_management_no_face_returns_empty_and_creates_no_event(
    client, db, monkeypatch
):
    """B3 #1 + #7."""
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="m-noface")
    headers = auth_headers(client, "adm")
    monkeypatch.setattr(deps.face_model, "get_faces", _stub_faces())

    response = client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": str(camera.id)},
        files=_file(),
    )
    assert response.status_code == 200
    assert response.json() == {"results": []}
    assert _event_count(db) == 0


def test_management_multiple_faces_rejected_and_no_event(
    client, db, monkeypatch
):
    """B3 #8."""
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="m-multi")
    make_person(db, identifier="10101-0101010-1")
    headers = auth_headers(client, "adm")
    monkeypatch.setattr(
        deps.face_model,
        "get_faces",
        _stub_faces(_MATCH_EMB, _MATCH_EMB),
    )

    response = client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": str(camera.id)},
        files=_file(),
    )
    assert response.status_code == 400
    assert "Multiple faces detected" in response.json()["detail"]
    assert _event_count(db) == 0


def test_management_unknown_person_creates_no_event(client, db, monkeypatch):
    """B3 #9."""
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="m-unknown")
    make_person(db, identifier="20202-0202020-2")
    headers = auth_headers(client, "adm")
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(_NOMATCH_EMB)
    )

    response = client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": str(camera.id)},
        files=_file(),
    )
    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["matched"] is False
    assert result["person_id"] is None
    assert result["timestamp"] is None
    assert _event_count(db) == 0


def test_management_success_creates_exactly_one_event(client, db, monkeypatch):
    """B3 #2, #3, #4, #5, #6, #19."""
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="m-ok")
    person = make_person(db, name="Match Me", identifier="30303-0303030-3")
    headers = auth_headers(client, "adm")
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(_MATCH_EMB)
    )

    response = client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": str(camera.id)},
        files=_file(),
    )
    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["matched"] is True
    assert result["person_id"] == person.id
    assert result["name"] == "Match Me"
    assert result["timestamp"] is not None

    events = db.query(RecognitionEvent).all()
    assert len(events) == 1
    assert events[0].person_id == person.id
    assert events[0].camera_id == camera.id
    assert events[0].timestamp is not None


# ---------------------------------------------------------------------------
# Dedicated Camera URL entry point
# ---------------------------------------------------------------------------

def test_dedicated_valid_slug_works(client, db):
    """B3 #11."""
    make_camera(db, slug="door-a", is_active=True)
    response = client.post("/recognition/camera/door-a", files=_file())
    assert response.status_code == 200
    assert response.json() == {"results": []}


def test_dedicated_unknown_slug_is_404(client, db):
    """B3 #12."""
    response = client.post(
        "/recognition/camera/ghost-camera", files=_file()
    )
    assert response.status_code == 404


def test_dedicated_disabled_camera_is_404(client, db):
    """B3 #13."""
    make_camera(db, slug="door-b", is_active=False)
    response = client.post("/recognition/camera/door-b", files=_file())
    assert response.status_code == 404
    assert _event_count(db) == 0


def test_dedicated_success_creates_one_event_with_camera(
    client, db, monkeypatch
):
    """B3 #14, #15, #19."""
    camera = make_camera(db, slug="pub-cam")
    person = make_person(db, name="Pub Match", identifier="40404-0404040-4")
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(_MATCH_EMB)
    )

    response = client.post(
        f"/recognition/camera/{camera.slug}", files=_file()
    )
    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["matched"] is True
    assert result["person_id"] == person.id

    events = db.query(RecognitionEvent).all()
    assert len(events) == 1
    assert events[0].camera_id == camera.id
    assert events[0].person_id == person.id
    assert events[0].timestamp is not None


def test_dedicated_url_exposes_no_management_surface(client, db):
    """B3 #16: the public recognition URL grants no management access."""
    make_camera(db, slug="pub-surface")

    # GET is not a recognition verb here
    assert client.get("/recognition/camera/pub-surface").status_code == 405

    # No session was created; management endpoints remain unauthenticated
    for path in ("/persons", "/cameras", "/users", "/dashboard", "/activity"):
        assert client.get(path).status_code == 401


# ---------------------------------------------------------------------------
# Unification
# ---------------------------------------------------------------------------

def test_both_entry_points_call_the_canonical_service_operation(
    client, db, monkeypatch
):
    """B3 #17: both routes funnel into RecognitionService.recognize_faces
    with an explicit camera_id and nothing else."""
    make_admin(db, username="adm", role="admin")
    cam_a = make_camera(db, name="Mgmt Cam", slug="mgmt-cam")
    cam_b = make_camera(db, name="Public Cam", slug="public-cam")
    headers = auth_headers(client, "adm")

    calls: list[int] = []

    def _fake(self, image, camera_id):
        calls.append(camera_id)
        return RecognitionResponse(results=[])

    monkeypatch.setattr(RecognitionService, "recognize_faces", _fake)

    client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": str(cam_a.id)},
        files=_file(),
    )
    client.post(f"/recognition/camera/{cam_b.slug}", files=_file())

    assert calls == [cam_a.id, cam_b.id]


def test_both_entry_points_produce_equivalent_event_data(
    client, db, monkeypatch
):
    """B3 #18: equivalent recognition through either route yields an
    equivalently-shaped Recognition Event, differing only by camera."""
    make_admin(db, username="adm", role="admin")
    cam_mgmt = make_camera(db, name="Eq Mgmt", slug="eq-mgmt")
    cam_pub = make_camera(db, name="Eq Pub", slug="eq-pub")
    person = make_person(db, name="Eq Person", identifier="50505-0505050-5")
    headers = auth_headers(client, "adm")
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(_MATCH_EMB)
    )

    client.post(
        "/recognition",
        headers=headers,
        data={"camera_id": str(cam_mgmt.id)},
        files=_file(),
    )
    client.post(f"/recognition/camera/{cam_pub.slug}", files=_file())

    events = (
        db.query(RecognitionEvent)
        .order_by(RecognitionEvent.id)
        .all()
    )
    assert len(events) == 2

    mgmt_event, pub_event = events
    for event in events:
        assert event.person_id == person.id
        assert event.timestamp is not None
        assert isinstance(event.match_distance, float)
    assert mgmt_event.camera_id == cam_mgmt.id
    assert pub_event.camera_id == cam_pub.id
