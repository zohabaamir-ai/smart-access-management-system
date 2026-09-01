from app.repositories.person_activity_repository import (
    PersonActivityRepository,
)


class PersonActivityService:

    REGISTERED = "registered"
    EDITED = "edited"
    DELETED = "deleted"

    def __init__(
        self,
        person_activity_repository: (
            PersonActivityRepository
        ),
    ):
        self.person_activity_repository = (
            person_activity_repository
        )

    def record_registered(
        self,
        person_id: int,
        person_name: str,
        performed_by: int,
    ):

        return (
            self.person_activity_repository
            .create_activity(
                person_id=person_id,
                person_name=person_name,
                action=self.REGISTERED,
                performed_by=performed_by,
            )
        )

    def record_edited(
        self,
        person_id: int,
        person_name: str,
        performed_by: int,
    ):

        return (
            self.person_activity_repository
            .create_activity(
                person_id=person_id,
                person_name=person_name,
                action=self.EDITED,
                performed_by=performed_by,
            )
        )

    def record_deleted(
        self,
        person_id: int,
        person_name: str,
        performed_by: int,
    ):

        return (
            self.person_activity_repository
            .create_activity(
                person_id=person_id,
                person_name=person_name,
                action=self.DELETED,
                performed_by=performed_by,
            )
        )

    def get_latest_activity(self):
        return (
            self.person_activity_repository
            .get_latest_activity()
        )

    def get_recent_activities(
        self,
        limit: int = 50,
    ):
        return (
            self.person_activity_repository
            .get_recent_activities(
                limit=limit
            )
        )