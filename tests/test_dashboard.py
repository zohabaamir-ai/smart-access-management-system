"""Characterization: GET /dashboard."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from tests.helpers import (
    auth_headers,
    make_admin,
    make_person,
    make_recognition_event,
    make_camera,
)

_PKT = ZoneInfo("Asia/Karachi")


def test_dashboard_populated_metrics(client, db):
    """T6: aggregates over today's events + recent_entries ordered timestamp desc."""
    make_admin(db, username="op", role="operator")
    p1 = make_person(db, name="Alpha", identifier="40404-0404040-4")
    p2 = make_person(db, name="Beta", identifier="50505-0505050-5")
    camera = make_camera(db)

    start_today_pkt = datetime.now(_PKT).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    def at(hours: int, minutes: int) -> datetime:
        return (
            start_today_pkt + timedelta(hours=hours, minutes=minutes)
        ).astimezone(timezone.utc)

    make_recognition_event(
        db, person_id=p1.id, camera_id=camera.id,
        match_distance=0.2, timestamp=at(6, 1),
    )
    make_recognition_event(
        db, person_id=p1.id, camera_id=camera.id,
        match_distance=0.4, timestamp=at(6, 2),
    )
    make_recognition_event(
        db, person_id=p2.id, camera_id=camera.id,
        match_distance=0.6, timestamp=at(6, 3),
    )

    headers = auth_headers(client, "op")
    body = client.get("/dashboard", headers=headers).json()

    assert body["total_persons"] == 2
    assert body["todays_entries"] == 3
    assert body["unique_persons_today"] == 2
    assert body["average_match_distance"] == pytest.approx(0.4)

    timestamps = [e["timestamp"] for e in body["recent_entries"]]
    assert len(timestamps) == 3
    assert timestamps == sorted(timestamps, reverse=True)


def test_dashboard_empty_shape(client, db):
    make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "op")

    response = client.get("/dashboard", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "total_persons",
        "todays_entries",
        "unique_persons_today",
        "average_match_distance",
        "recent_entries",
    }
    assert body["total_persons"] == 0
    assert body["todays_entries"] == 0
    assert body["unique_persons_today"] == 0
    assert body["average_match_distance"] is None
    assert body["recent_entries"] == []


def test_dashboard_recent_entries_include_identifier(client, db):
    """CURRENT behavior: recent_entries expose CNIC (identifier), no redaction."""
    make_admin(db, username="op", role="operator")
    person = make_person(db, name="Del", identifier="88888-8888888-8")
    camera = make_camera(db)
    make_recognition_event(
        db, person_id=person.id, camera_id=camera.id, match_distance=0.5
    )
    headers = auth_headers(client, "op")

    response = client.get("/dashboard", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total_persons"] == 1
    assert len(body["recent_entries"]) == 1
    entry = body["recent_entries"][0]
    assert set(entry) == {
        "id",
        "person_id",
        "name",
        "identifier",
        "timestamp",
        "match_distance",
    }
    assert entry["identifier"] == "88888-8888888-8"
    assert entry["name"] == "Del"


def test_dashboard_requires_auth(client):
    assert client.get("/dashboard").status_code == 401
