"""Biometric identity integrity for the Person enrolment / photo-update flow.

A Person record is an identity anchor. Creating a new Person rejects a
face that already belongs to someone. Editing an existing Person's photo
is a picture/embedding refresh for the SAME identity — it must reject
both another enrolled person's face AND an unknown face, and it must
leave the original record completely untouched when it rejects.

Matrix (see the ticket):

  new person   + unique face                 -> 200
  new person   + existing person's face      -> 400 (duplicate)
  existing     + same person's new photo     -> 200
  existing     + another enrolled face       -> 400 (duplicate)
  existing     + unknown / different face    -> 400 (identity mismatch)
  rejected existing update                   -> original embedding/photo/fields intact
"""

from __future__ import annotations

import pytest
import torch

from app.api import deps
from app.db.db_models.person import Person
from app.models.face_model import DetectedFace
from app.repositories.person_repository import PersonRepository

from tests.helpers import (
    EMBEDDING_DIM,
    auth_headers,
    blank_jpeg_bytes,
    make_admin,
    make_person,
)

# ---------------------------------------------------------------------------
# Controlled embeddings. Uniform vectors, so the L2 distance between two of
# them is sqrt(EMBEDDING_DIM) * |a - b| ~= 22.63 * |a - b|.
#
#   duplicate_face_match_threshold default = 0.75
# ---------------------------------------------------------------------------

EMB_ALI = [0.0] * EMBEDDING_DIM               # the enrolled anchor
EMB_ALI_NEW_PHOTO = [0.01] * EMBEDDING_DIM    # ~0.23 away  -> same person
EMB_SARA = [1.0] * EMBEDDING_DIM              # ~22.6 away  -> different, enrolled
EMB_UNKNOWN = [5.0] * EMBEDDING_DIM           # far from everyone, not enrolled


def _stub_faces(*embeddings):
    """Replacement for FaceModel.get_faces returning one DetectedFace per
    supplied embedding (no args = "no face detected")."""

    def _get_faces(_image):
        return [
            DetectedFace(
                embedding=torch.tensor(e, dtype=torch.float32),
                box=(0.0, 0.0, 1.0, 1.0),
            )
            for e in embeddings
        ]

    return _get_faces


def _jpeg():
    return {"file": ("frame.jpg", blank_jpeg_bytes(), "image/jpeg")}


@pytest.fixture
def no_disk_photos(monkeypatch):
    """A successful enrol / photo update writes a real JPEG to
    app/uploads/persons. Stub the file I/O so the success-path tests stay
    hermetic; the rejection tests never reach it."""

    stub_path = "app/uploads/persons/_identity_integrity_stub.jpg"
    for module in (
        "app.services.person_service",
        "app.services.enrollment_service",
    ):
        monkeypatch.setattr(
            f"{module}.save_person_photo", lambda _image: stub_path
        )
        monkeypatch.setattr(
            f"{module}.delete_person_photo", lambda _path: None
        )


def _reload(db, person_id: int) -> Person:
    db.expire_all()
    return db.query(Person).filter(Person.id == person_id).one()


# ===========================================================================
# NEW PERSON ENROLMENT
# ===========================================================================

def test_new_person_unique_face_succeeds(client, db, monkeypatch, no_disk_photos):
    make_admin(db, username="adm", role="admin")
    make_person(db, name="Ali Khan", identifier="35201-1111111-1",
                embedding=EMB_ALI)
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(EMB_UNKNOWN)
    )
    headers = auth_headers(client, "adm")

    response = client.post(
        "/persons/enroll",
        headers=headers,
        data={"name": "Bob New", "identifier": "35201-3333333-3"},
        files=_jpeg(),
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["name"] == "Bob New"
    assert body["message"] == "Person enrolled successfully."
    assert (
        db.query(Person)
        .filter(Person.identifier == "35201-3333333-3")
        .count()
        == 1
    )


def test_new_person_with_existing_persons_face_rejected(
    client, db, monkeypatch
):
    make_admin(db, username="adm", role="admin")
    make_person(db, name="Ali Khan", identifier="35201-1111111-1",
                embedding=EMB_ALI)
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(EMB_ALI)
    )
    headers = auth_headers(client, "adm")

    response = client.post(
        "/persons/enroll",
        headers=headers,
        data={"name": "Sara Ahmed", "identifier": "35201-2222222-2"},
        files=_jpeg(),
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "This face is already registered to another person."
    }
    # nothing new persisted
    assert db.query(Person).count() == 1


# ===========================================================================
# EXISTING PERSON PHOTO UPDATE
# ===========================================================================

def test_existing_person_same_face_update_succeeds(client, db, monkeypatch, no_disk_photos):
    make_admin(db, username="adm", role="admin")
    ali = make_person(db, name="Ali Khan", identifier="35201-1111111-1",
                      embedding=EMB_ALI)
    ali_id = ali.id
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(EMB_ALI_NEW_PHOTO)
    )
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/persons/{ali_id}", headers=headers, files=_jpeg()
    )

    assert response.status_code == 200, response.text
    fresh = _reload(db, ali_id)
    assert fresh.name == "Ali Khan"
    assert fresh.identifier == "35201-1111111-1"
    # embedding replaced with the new same-person photo
    assert fresh.embedding[0] == pytest.approx(0.01, abs=1e-4)
    assert fresh.embedding != EMB_ALI


def test_existing_person_other_enrolled_face_rejected(
    client, db, monkeypatch
):
    make_admin(db, username="adm", role="admin")
    ali = make_person(db, name="Ali Khan", identifier="35201-1111111-1",
                      embedding=EMB_ALI)
    make_person(db, name="Sara Ahmed", identifier="35201-2222222-2",
                embedding=EMB_SARA)
    ali_id = ali.id
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(EMB_SARA)
    )
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/persons/{ali_id}", headers=headers, files=_jpeg()
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "This face is already registered to another person."
    }
    assert _reload(db, ali_id).embedding == EMB_ALI


def test_existing_person_unknown_face_rejected(client, db, monkeypatch):
    make_admin(db, username="adm", role="admin")
    ali = make_person(db, name="Ali Khan", identifier="35201-1111111-1",
                      embedding=EMB_ALI)
    ali_id = ali.id
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(EMB_UNKNOWN)
    )
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/persons/{ali_id}", headers=headers, files=_jpeg()
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "This photo does not match the enrolled person."
    }
    assert _reload(db, ali_id).embedding == EMB_ALI


# ===========================================================================
# DATA PRESERVATION ON REJECTED UPDATES
# ===========================================================================

def test_rejected_unknown_face_preserves_embedding_and_photo(
    client, db, monkeypatch
):
    make_admin(db, username="adm", role="admin")
    ali = make_person(db, name="Ali Khan", identifier="35201-1111111-1",
                      photo_path="original.jpg", embedding=EMB_ALI)
    ali_id = ali.id
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(EMB_UNKNOWN)
    )
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/persons/{ali_id}", headers=headers, files=_jpeg()
    )

    assert response.status_code == 400
    fresh = _reload(db, ali_id)
    assert fresh.embedding == EMB_ALI
    assert fresh.photo_path == "original.jpg"


def test_rejected_duplicate_face_preserves_embedding(client, db, monkeypatch):
    make_admin(db, username="adm", role="admin")
    ali = make_person(db, name="Ali Khan", identifier="35201-1111111-1",
                      photo_path="original.jpg", embedding=EMB_ALI)
    make_person(db, name="Sara Ahmed", identifier="35201-2222222-2",
                embedding=EMB_SARA)
    ali_id = ali.id
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(EMB_SARA)
    )
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/persons/{ali_id}", headers=headers, files=_jpeg()
    )

    assert response.status_code == 400
    fresh = _reload(db, ali_id)
    assert fresh.embedding == EMB_ALI
    assert fresh.photo_path == "original.jpg"


def test_rejected_photo_update_preserves_identity_fields(
    client, db, monkeypatch
):
    make_admin(db, username="adm", role="admin")
    ali = make_person(db, name="Ali Khan", identifier="35201-1111111-1",
                      embedding=EMB_ALI)
    ali_id = ali.id
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(EMB_UNKNOWN)
    )
    headers = auth_headers(client, "adm")

    # a rejected photo update that also tries to rename must not partially apply
    response = client.patch(
        f"/persons/{ali_id}",
        headers=headers,
        data={"name": "Renamed By Mistake"},
        files=_jpeg(),
    )

    assert response.status_code == 400
    fresh = _reload(db, ali_id)
    assert fresh.name == "Ali Khan"
    assert fresh.identifier == "35201-1111111-1"
    assert fresh.embedding == EMB_ALI


def test_successful_same_person_update_changes_only_biometric(
    client, db, monkeypatch, no_disk_photos
):
    make_admin(db, username="adm", role="admin")
    ali = make_person(db, name="Ali Khan", identifier="35201-1111111-1",
                      photo_path=None, embedding=EMB_ALI)
    ali_id = ali.id
    monkeypatch.setattr(
        deps.face_model, "get_faces", _stub_faces(EMB_ALI_NEW_PHOTO)
    )
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/persons/{ali_id}", headers=headers, files=_jpeg()
    )

    assert response.status_code == 200, response.text
    fresh = _reload(db, ali_id)
    # identity untouched
    assert fresh.name == "Ali Khan"
    assert fresh.identifier == "35201-1111111-1"
    # only the biometric photo/embedding moved
    assert fresh.embedding[0] == pytest.approx(0.01, abs=1e-4)
    assert fresh.photo_path is not None


# ===========================================================================
# REPOSITORY HELPER + EXISTING DUPLICATE PROTECTION (regression guard)
# ===========================================================================

def test_embedding_distance_to_person_helper(db):
    ali = make_person(db, name="Ali Khan", identifier="35201-1111111-1",
                      embedding=EMB_ALI)
    repo = PersonRepository(db)

    same = repo.embedding_distance_to_person(
        ali, torch.tensor(EMB_ALI, dtype=torch.float32)
    )
    assert same == pytest.approx(0.0, abs=1e-5)

    far = repo.embedding_distance_to_person(
        ali, torch.tensor(EMB_SARA, dtype=torch.float32)
    )
    assert far == pytest.approx(EMBEDDING_DIM ** 0.5, rel=1e-4)

    # a record with no usable embedding has no identity anchor to compare
    ali.embedding = []
    db.commit()
    assert (
        repo.embedding_distance_to_person(
            ali, torch.tensor(EMB_ALI, dtype=torch.float32)
        )
        is None
    )


def test_existing_duplicate_face_protection_unchanged(db):
    """B2 #13 regression: find_person_by_embedding still detects a
    near-identical face and still excludes the named person."""
    ali = make_person(db, name="Ali Khan", identifier="35201-1111111-1",
                      embedding=EMB_ALI)
    repo = PersonRepository(db)

    match = repo.find_person_by_embedding(
        torch.tensor(EMB_ALI, dtype=torch.float32)
    )
    assert match is not None and match.id == ali.id

    assert (
        repo.find_person_by_embedding(
            torch.tensor(EMB_UNKNOWN, dtype=torch.float32)
        )
        is None
    )
    assert (
        repo.find_person_by_embedding(
            torch.tensor(EMB_ALI, dtype=torch.float32),
            exclude_person_id=ali.id,
        )
        is None
    )
