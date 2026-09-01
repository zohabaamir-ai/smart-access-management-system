from app.repositories.person_repository import (
    PersonRepository,
)
from app.repositories.recognition_event_repository import (
    RecognitionEventRepository,
)
from app.schemas.dashboard_schemas import (
    DashboardRecentEntry,
    DashboardResponse,
)


class DashboardService:
    """Orchestrates the /dashboard use case.

    Coordinates the existing repository calls (person totals via
    ``PersonRepository``; recognition-event and aggregate queries via
    ``RecognitionEventRepository``) and assembles the ``DashboardResponse``.
    No query logic lives here — it stays in the repositories.
    """

    def __init__(
        self,
        person_repository: PersonRepository,
        recognition_event_repository: RecognitionEventRepository,
    ):
        self.person_repository = (
            person_repository
        )
        self.recognition_event_repository = (
            recognition_event_repository
        )

    def get_dashboard(
        self,
    ) -> DashboardResponse:

        recent_logs = (
            self.recognition_event_repository
            .get_recent_recognition_events(
                limit=10
            )
        )

        recent_entries = [
            DashboardRecentEntry(
                id=log.id,
                person_id=log.person_id,
                name=log.person.name,
                identifier=log.person.identifier,
                timestamp=log.timestamp,
                match_distance=log.match_distance,
            )
            for log in recent_logs
        ]

        return DashboardResponse(
            total_persons=(
                self.person_repository
                .get_total_persons()
            ),
            todays_entries=(
                self.recognition_event_repository
                .get_todays_entries()
            ),
            unique_persons_today=(
                self.recognition_event_repository
                .get_unique_persons_today()
            ),
            average_match_distance=(
                self.recognition_event_repository
                .get_average_match_distance_today()
            ),
            recent_entries=recent_entries,
        )
