import csv
import io
from datetime import date, timezone

from app.core.datetime_range import (
    PAKISTAN_TIMEZONE,
    dates_to_utc_range,
)
from app.repositories.recognition_event_repository import (
    RecognitionEventRepository,
)
from app.schemas.activity_schemas import (
    ActivityResponse,
)

# Stable CSV column order for Activity export.
_CSV_HEADER = [
    "Recognition Date",
    "Recognition Time",
    "Person",
    "Person ID",
    "Camera",
    "Camera ID",
    "Camera Location",
    "Match Distance",
]


class ActivityService:
    """Activity is a read/query layer over Recognition Events.

    One filter/query path (``_filtered_events``) feeds both outputs:

        Activity filters -> _filtered_events -> ┬─ list_activity  (JSON)
                                               └─ export_activity_csv (CSV)
    """

    def __init__(
        self,
        recognition_event_repository: RecognitionEventRepository,
    ):
        self.recognition_event_repository = (
            recognition_event_repository
        )

    # ---------------------------------------------------------
    # shared query
    # ---------------------------------------------------------

    def _filtered_events(
        self,
        start_date: date | None,
        end_date: date | None,
        person_id: int | None,
        camera_id: int | None,
        search: str | None,
    ):
        start_utc, end_utc = dates_to_utc_range(
            start_date,
            end_date,
        )

        return (
            self.recognition_event_repository
            .get_filtered_recognition_events(
                start_utc=start_utc,
                end_utc=end_utc,
                person_id=person_id,
                camera_id=camera_id,
                search=search,
            )
        )

    # ---------------------------------------------------------
    # list
    # ---------------------------------------------------------

    def list_activity(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        person_id: int | None = None,
        camera_id: int | None = None,
        search: str | None = None,
    ) -> list[ActivityResponse]:

        events = self._filtered_events(
            start_date,
            end_date,
            person_id,
            camera_id,
            search,
        )

        return [
            ActivityResponse(
                id=event.id,
                person_id=event.person_id,
                person_name=event.person.name,
                identifier=event.person.identifier,
                camera_id=event.camera_id,
                camera_name=event.camera.name,
                camera_location=event.camera.location,
                timestamp=event.timestamp,
                match_distance=event.match_distance,
            )
            for event in events
        ]

    # ---------------------------------------------------------
    # CSV export — same filters, same query
    # ---------------------------------------------------------

    def export_activity_csv(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        person_id: int | None = None,
        camera_id: int | None = None,
        search: str | None = None,
    ) -> str:

        events = self._filtered_events(
            start_date,
            end_date,
            person_id,
            camera_id,
            search,
        )

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(_CSV_HEADER)

        for event in events:
            local_ts = self._to_local(event.timestamp)
            writer.writerow(
                [
                    local_ts.strftime("%Y-%m-%d"),
                    local_ts.strftime("%H:%M:%S"),
                    event.person.name,
                    event.person_id,
                    event.camera.name,
                    event.camera_id,
                    event.camera.location,
                    f"{event.match_distance:.4f}",
                ]
            )

        return buffer.getvalue()

    @staticmethod
    def _to_local(value):
        """Recognition timestamps are stored in UTC; present the CSV
        date/time in Asia/Karachi, consistent with the rest of the app."""
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(PAKISTAN_TIMEZONE)
