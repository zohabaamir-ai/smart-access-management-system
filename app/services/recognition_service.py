import torch

from PIL import Image

from app.models.face_model import FaceModel
from app.schemas.recognition_schemas import (
    RecognitionResult,
    RecognitionResponse,
)
from app.services.system_setting_service import (
    SystemSettingService,
)


class RecognitionService:
    def __init__(
        self,
        face_model: FaceModel,
        person_repository,
        recognition_event_repository,
        system_setting_service: SystemSettingService,
    ):
        self.face_model = face_model
        self.person_repository = person_repository
        self.recognition_event_repository = (
            recognition_event_repository
        )
        self.system_setting_service = (
            system_setting_service
        )

    def _euclidean_distance(
        self,
        embedding_1,
        embedding_2,
    ) -> float:
        return (
            embedding_1 - embedding_2
        ).norm().item()

    def _find_best_match(
        self,
        face_embedding,
        persons,
    ):
        best_distance = float("inf")
        best_person = None

        for person in persons:
            stored_embedding = torch.tensor(
                person.embedding
            )

            distance = self._euclidean_distance(
                face_embedding,
                stored_embedding,
            )

            if distance < best_distance:
                best_distance = distance
                best_person = person

        return best_person, best_distance

    def recognize_faces(
        self,
        image: Image.Image,
        camera_id: int,
    ) -> RecognitionResponse:
        """Canonical recognition operation.

        Both HTTP entry points (management ``POST /recognition`` and the
        dedicated ``POST /recognition/camera/{slug}``) call this with an
        explicit, already-resolved ``camera_id``.

        A single successful recognition creates exactly one Recognition
        Event, attributed to the given Camera, at ``log_recognition_event``
        below — the one and only event-creation point in the flow.
        No-face, multiple-face and unrecognized outcomes create no event.
        """

        detected_faces = (
            self.face_model.get_faces(image)
        )

        # No face -> no event.
        if len(detected_faces) == 0:
            return RecognitionResponse(
                results=[]
            )

        # Multiple faces -> no event.
        if len(detected_faces) > 1:
            raise ValueError(
                "Multiple faces detected. "
                "Please ensure only one person "
                "is in front of the camera."
            )

        # Current, Super-Admin-configurable match threshold. Read once
        # per recognition (System Settings is authoritative), so a
        # change takes effect on the next request with no restart.
        match_threshold = (
            self.system_setting_service
            .get_value("recognition_match_threshold")
        )

        persons = (
            self.person_repository
            .get_all_persons()
        )

        face = detected_faces[0]

        best_person, best_distance = (
            self._find_best_match(
                face.embedding,
                persons,
            )
        )

        # No enrolled Person matched -> no event.
        if (
            best_person is None
            or best_distance
            > match_threshold
        ):
            return RecognitionResponse(
                results=[
                    RecognitionResult(
                        person_id=None,
                        name=None,
                        distance=best_distance,
                        matched=False,
                        timestamp=None,
                    )
                ]
            )

        # Person recognized through this Camera at this time:
        # exactly one Recognition Event. This is the historical record;
        # V1 has no per-recognition notification (Activity covers it).
        recognition_event = (
            self.recognition_event_repository
            .log_recognition_event(
                person_id=best_person.id,
                match_distance=best_distance,
                camera_id=camera_id,
            )
        )

        return RecognitionResponse(
            results=[
                RecognitionResult(
                    person_id=best_person.id,
                    name=best_person.name,
                    distance=best_distance,
                    matched=True,
                    timestamp=recognition_event.timestamp,
                )
            ]
        )