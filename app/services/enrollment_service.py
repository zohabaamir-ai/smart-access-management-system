from PIL import Image

from app.core.cnic import normalize_cnic
from app.core.person_name import normalize_person_name

from app.models.face_model import FaceModel

from app.repositories.person_repository import (
    PersonRepository,
)

from app.schemas.enrollment_schemas import (
    EnrollmentResponse,
    EnrollmentError,
)

from app.services.person_activity_service import (
    PersonActivityService,
)

from app.services.system_setting_service import (
    SystemSettingService,
)

from app.utils.person_photo import (
    save_person_photo,
    delete_person_photo,
)


class EnrollmentService:

    def __init__(
        self,
        face_model: FaceModel,
        person_repository: PersonRepository,
        person_activity_service: PersonActivityService,
        system_setting_service: SystemSettingService,
    ):
        self.face_model = face_model

        self.person_repository = (
            person_repository
        )

        self.person_activity_service = (
            person_activity_service
        )

        self.system_setting_service = (
            system_setting_service
        )

    def enroll_person(
        self,
        name: str,
        identifier: str,
        image: Image.Image,
        performed_by: int,
    ) -> EnrollmentResponse:

        photo_path = None

        try:

            # ==================================================
            # NAME
            # ==================================================

            try:
                final_name = (
                    normalize_person_name(
                        name
                    )
                )

            except ValueError as e:
                raise EnrollmentError(
                    str(e)
                )

            # ==================================================
            # CNIC
            # ==================================================

            try:
                final_identifier = (
                    normalize_cnic(
                        identifier
                    )
                )

            except ValueError as e:
                raise EnrollmentError(
                    str(e)
                )

            # ==================================================
            # CNIC UNIQUENESS
            # ==================================================

            existing_person = (
                self.person_repository
                .get_person_by_identifier(
                    final_identifier
                )
            )

            if existing_person is not None:
                raise EnrollmentError(
                    "A person with this CNIC# already exists."
                )

            # ==================================================
            # FACE DETECTION
            # ==================================================

            detected_faces = (
                self.face_model.get_faces(
                    image
                )
            )

            if len(detected_faces) == 0:
                raise EnrollmentError(
                    "No face detected in the photo. "
                    "Please upload a clear, "
                    "front-facing photo."
                )

            if len(detected_faces) > 1:
                raise EnrollmentError(
                    f"Found {len(detected_faces)} faces. "
                    "Please upload a photo with only one person."
                )

            face = detected_faces[0]

            # ==================================================
            # DUPLICATE FACE CHECK
            # ==================================================

            duplicate_person = (
                self.person_repository
                .find_person_by_embedding(
                    embedding=face.embedding,
                    threshold=
                        self.system_setting_service
                        .get_value(
                            "duplicate_face_match_threshold"
                        ),
                )
            )

            if duplicate_person is not None:
                raise EnrollmentError(
                    "This face is already registered "
                    "to another person."
                )

            # ==================================================
            # SAVE PHOTO
            # ==================================================

            photo_path = (
                save_person_photo(
                    image
                )
            )

            # ==================================================
            # CREATE PERSON
            # ==================================================

            person = (
                self.person_repository
                .create_person(
                    name=final_name,
                    identifier=
                        final_identifier,
                    embedding=
                        face.embedding,
                    photo_path=
                        photo_path,
                    registered_by_admin_id=
                        performed_by,
                )
            )

            # ==================================================
            # REGISTERED ACTIVITY
            # ==================================================

            self.person_activity_service.record_registered(
                person_id=person.id,
                person_name=person.name,
                performed_by=performed_by,
            )

            # ==================================================
            # COMMIT
            # ==================================================

            self.person_repository.db.commit()

            return EnrollmentResponse(
                person_id=person.id,
                name=person.name,
                message=
                    "Person enrolled successfully.",
            )

        except EnrollmentError:
            self.person_repository.db.rollback()

            if photo_path:
                delete_person_photo(
                    photo_path
                )

            raise

        except Exception:
            self.person_repository.db.rollback()

            if photo_path:
                delete_person_photo(
                    photo_path
                )

            raise EnrollmentError(
                "Failed to enroll person."
            )