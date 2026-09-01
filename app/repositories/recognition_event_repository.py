from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.datetime_range import today_utc_range
from app.db.db_models.person import Person
from app.db.db_models.recognition_event import (
    RecognitionEvent,
)


class RecognitionEventRepository:

    def __init__(
        self,
        db: Session,
    ):
        self.db = db

    # =========================================================
    # RECOGNITION
    # =========================================================

    def log_recognition_event(
        self,
        person_id: int,
        match_distance: float,
        camera_id: int,
    ) -> RecognitionEvent:

        event = RecognitionEvent(
            person_id=person_id,
            match_distance=match_distance,
            camera_id=camera_id,
        )

        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)

        return event

    def get_filtered_recognition_events(
        self,
        start_utc: datetime | None = None,
        end_utc: datetime | None = None,
        person_id: int | None = None,
        camera_id: int | None = None,
        search: str | None = None,
    ) -> list[RecognitionEvent]:
        """Canonical Activity query over Recognition Events.

        Every Activity read (list and CSV export) goes through this one
        method so the filter semantics are shared. Ordered newest first.
        """

        query = (
            self.db.query(
                RecognitionEvent
            )
            .join(Person)
        )

        if start_utc is not None:
            query = query.filter(
                RecognitionEvent.timestamp
                >= start_utc
            )

        if end_utc is not None:
            query = query.filter(
                RecognitionEvent.timestamp
                < end_utc
            )

        if person_id is not None:
            query = query.filter(
                RecognitionEvent.person_id
                == person_id
            )

        if camera_id is not None:
            query = query.filter(
                RecognitionEvent.camera_id
                == camera_id
            )

        if search:
            search_term = (
                f"%{search.strip()}%"
            )

            query = query.filter(
                (
                    Person.name.ilike(
                        search_term
                    )
                )
                | (
                    Person.identifier.ilike(
                        search_term
                    )
                )
            )

        return (
            query
            .order_by(
                RecognitionEvent.timestamp.desc()
            )
            .all()
        )

    def get_recent_recognition_events(
        self,
        limit: int = 10,
    ) -> list[RecognitionEvent]:

        return (
            self.db.query(
                RecognitionEvent
            )
            .order_by(
                RecognitionEvent.timestamp.desc()
            )
            .limit(limit)
            .all()
        )

    # =========================================================
    # DASHBOARD
    # =========================================================

    def _get_today_utc_range(
        self,
    ) -> tuple[
        datetime,
        datetime,
    ]:

        return today_utc_range()

    def get_todays_entries(
        self,
    ) -> int:

        start_utc, end_utc = (
            self._get_today_utc_range()
        )

        return (
            self.db.query(
                func.count(
                    RecognitionEvent.id
                )
            )
            .filter(
                RecognitionEvent.timestamp
                >= start_utc,
                RecognitionEvent.timestamp
                < end_utc,
            )
            .scalar()
            or 0
        )

    def get_unique_persons_today(
        self,
    ) -> int:

        start_utc, end_utc = (
            self._get_today_utc_range()
        )

        return (
            self.db.query(
                func.count(
                    func.distinct(
                        RecognitionEvent.person_id
                    )
                )
            )
            .filter(
                RecognitionEvent.timestamp
                >= start_utc,
                RecognitionEvent.timestamp
                < end_utc,
            )
            .scalar()
            or 0
        )

    def get_average_match_distance_today(
        self,
    ) -> float | None:

        start_utc, end_utc = (
            self._get_today_utc_range()
        )

        result = (
            self.db.query(
                func.avg(
                    RecognitionEvent.match_distance
                )
            )
            .filter(
                RecognitionEvent.timestamp
                >= start_utc,
                RecognitionEvent.timestamp
                < end_utc,
            )
            .scalar()
        )

        if result is None:
            return None

        return float(result)
