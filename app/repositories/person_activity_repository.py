from sqlalchemy.orm import Session

from app.db.db_models.person_activity import (
    PersonActivity,
)


class PersonActivityRepository:
    def __init__(
        self,
        db: Session,
    ):
        self.db = db

    def create_activity(
        self,
        person_id: int,
        person_name: str,
        action: str,
        performed_by: int,
    ) -> PersonActivity:

        activity = PersonActivity(
            person_id=person_id,
            person_name=person_name,
            action=action,
            performed_by=performed_by,
        )

        self.db.add(activity)
        self.db.flush()

        return activity

    def get_latest_activity(
        self,
    ) -> PersonActivity | None:

        return (
            self.db.query(
                PersonActivity
            )
            .order_by(
                PersonActivity.timestamp.desc(),
                PersonActivity.id.desc(),
            )
            .first()
        )

    def get_recent_activities(
        self,
        limit: int = 50,
    ) -> list[PersonActivity]:

        return (
            self.db.query(
                PersonActivity
            )
            .order_by(
                PersonActivity.timestamp.desc(),
                PersonActivity.id.desc(),
            )
            .limit(limit)
            .all()
        )