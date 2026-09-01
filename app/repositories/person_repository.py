from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import DUPLICATE_FACE_THRESHOLD
from app.db.db_models.person import Person
from app.db.db_models.recognition_event import (
    RecognitionEvent,
)


class PersonRepository:

    def __init__(
        self,
        db: Session,
    ):
        self.db = db

    # =========================================================
    # PERSON
    # =========================================================

    def create_person(
        self,
        name: str,
        identifier: str,
        embedding,
        photo_path: str | None = None,
        registered_by_admin_id: int | None = None,
    ) -> Person:

        person = Person(
            name=name,
            identifier=identifier,
            embedding=embedding.tolist(),
            photo_path=photo_path,
            registered_by_admin_id=(
                registered_by_admin_id
            ),
        )

        self.db.add(person)
        self.db.flush()
        self.db.refresh(person)

        return person

    def get_all_persons(
        self,
    ) -> list[Person]:

        return (
            self.db.query(Person)
            .all()
        )

    def get_person_by_id(
        self,
        person_id: int,
    ) -> Person | None:

        return (
            self.db.query(Person)
            .filter(
                Person.id == person_id
            )
            .first()
        )

    def get_person_by_identifier(
        self,
        identifier: str,
    ) -> Person | None:

        return (
            self.db.query(Person)
            .filter(
                Person.identifier
                == identifier
            )
            .first()
        )

    def update_person(
        self,
        person_id: int,
        name: str,
        identifier: str,
        embedding=None,
        photo_path: str | None = None,
    ) -> Person | None:

        person = (
            self.get_person_by_id(
                person_id
            )
        )

        if person is None:
            return None

        person.name = name
        person.identifier = identifier

        if embedding is not None:
            person.embedding = (
                embedding.tolist()
            )

        if photo_path is not None:
            person.photo_path = photo_path

        self.db.flush()
        self.db.refresh(person)

        return person

    def delete_person(
        self,
        person_id: int,
    ) -> bool:

        person = (
            self.get_person_by_id(
                person_id
            )
        )

        if person is None:
            return False

        self.db.query(
            RecognitionEvent
        ).filter(
            RecognitionEvent.person_id
            == person_id
        ).delete(
            synchronize_session=False
        )

        self.db.delete(person)
        self.db.commit()

        return True

    # =========================================================
    # FACE / IDENTITY MATCHING
    # =========================================================

    def embedding_distance_to_person(
        self,
        person: Person,
        embedding,
    ) -> float | None:
        """L2 distance between ``embedding`` and ``person``'s stored
        enrolled embedding.

        Returns ``None`` when the person has no stored embedding to
        compare against (there is no identity anchor yet). Used by the
        photo-update flow to decide whether an uploaded face is the
        SAME person before any duplicate search against other people.
        """

        import torch

        if not person.embedding:
            return None

        stored_embedding = torch.tensor(
            person.embedding,
            dtype=embedding.dtype,
            device=embedding.device,
        )

        return (
            embedding - stored_embedding
        ).norm().item()

    def find_person_by_embedding(
        self,
        embedding,
        exclude_person_id: int | None = None,
        threshold: float = DUPLICATE_FACE_THRESHOLD,
    ) -> Person | None:

        import torch

        best_person = None
        best_distance = float("inf")

        persons = (
            self.get_all_persons()
        )

        for person in persons:

            if (
                exclude_person_id is not None
                and person.id == exclude_person_id
            ):
                continue

            if not person.embedding:
                continue

            stored_embedding = torch.tensor(
                person.embedding,
                dtype=embedding.dtype,
                device=embedding.device,
            )

            distance = (
                embedding - stored_embedding
            ).norm().item()

            if distance < best_distance:
                best_distance = distance
                best_person = person

        if (
            best_person is not None
            and best_distance <= threshold
        ):
            return best_person

        return None

    # =========================================================
    # DASHBOARD
    # =========================================================

    def get_total_persons(
        self,
    ) -> int:

        return (
            self.db.query(
                func.count(Person.id)
            )
            .scalar()
            or 0
        )
