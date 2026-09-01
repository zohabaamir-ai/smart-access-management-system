from PIL import Image

from app.core.cnic import (
    normalize_cnic,
)

from app.core.person_name import (
    normalize_person_name,
)

from app.models.face_model import FaceModel

from app.repositories.person_repository import (
    PersonRepository,
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


class PersonUpdateError(Exception):

    def __init__(
        self,
        reason: str,
    ):
        self.reason = reason

        super().__init__(
            reason
        )


class PersonService:

    def __init__(
        self,
        face_model: FaceModel,
        person_repository: PersonRepository,
        person_activity_service: (
            PersonActivityService
        ),
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

    def update_person(
        self,
        person_id: int,
        performed_by: int,
        name: str | None = None,
        identifier: str | None = None,
        image: Image.Image | None = None,
    ):

        new_photo_path = None
        old_photo_path = None

        try:

            # ==================================================
            # FIND PERSON
            # ==================================================

            person = (
                self.person_repository
                .get_person_by_id(
                    person_id
                )
            )

            if person is None:
                raise PersonUpdateError(
                    "Person not found."
                )

            # ==================================================
            # NAME
            # ==================================================

            if name is not None:

                try:

                    final_name = (
                        normalize_person_name(
                            name
                        )
                    )

                except ValueError as e:

                    raise PersonUpdateError(
                        str(e)
                    )

            else:

                final_name = (
                    person.name
                )

            # ==================================================
            # CNIC
            # ==================================================

            if identifier is not None:

                try:

                    final_identifier = (
                        normalize_cnic(
                            identifier
                        )
                    )

                except ValueError as e:

                    raise PersonUpdateError(
                        str(e)
                    )

            else:

                final_identifier = (
                    person.identifier
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

            if (
                existing_person is not None
                and existing_person.id
                != person_id
            ):

                raise PersonUpdateError(
                    "A person with this CNIC# already exists."
                )

            # ==================================================
            # PHOTO / FACE
            # ==================================================

            embedding = None

            if image is not None:

                detected_faces = (
                    self.face_model
                    .get_faces(
                        image
                    )
                )

                if len(detected_faces) == 0:

                    raise PersonUpdateError(
                        "No face detected in the photo. "
                        "Please upload a clear, "
                        "front-facing photo."
                    )

                if len(detected_faces) > 1:

                    raise PersonUpdateError(
                        f"Found {len(detected_faces)} faces. "
                        "Please upload a photo with only one person."
                    )

                embedding = (
                    detected_faces[0]
                    .embedding
                )

                # ----------------------------------------------
                # BIOMETRIC IDENTITY INTEGRITY
                #
                # A Person record is an identity anchor. Editing
                # its photo replaces the picture for the SAME
                # identity — it is NOT a way to point the record
                # at a different face.
                #
                #   CHECK A  Is the uploaded face the CURRENT
                #            person again? -> legitimate photo
                #            replacement, allow.
                #
                #   otherwise the update is rejected:
                #
                #   CHECK B  Does it belong to ANOTHER enrolled
                #            person? -> "already registered to
                #            another person".
                #
                #   CHECK C  An unknown face that is not this
                #            person's -> identity mismatch.
                #
                # The existing duplicate_face_match_threshold
                # governs both the self-match and the
                # other-person search: it already encodes
                # "embeddings this close represent the same
                # identity", which is exactly CHECK A.
                # ----------------------------------------------

                threshold = (
                    self.system_setting_service
                    .get_value(
                        "duplicate_face_match_threshold"
                    )
                )

                # CHECK A — same person?
                self_distance = (
                    self.person_repository
                    .embedding_distance_to_person(
                        person,
                        embedding,
                    )
                )

                is_same_person = (
                    self_distance is not None
                    and self_distance <= threshold
                )

                if not is_same_person:

                    # CHECK B — another enrolled person?
                    duplicate_person = (
                        self.person_repository
                        .find_person_by_embedding(
                            embedding=embedding,
                            exclude_person_id=
                                person_id,
                            threshold=threshold,
                        )
                    )

                    if duplicate_person is not None:

                        raise PersonUpdateError(
                            "This face is already registered "
                            "to another person."
                        )

                    # CHECK C — unknown face. Reject as a
                    # mismatch when there was a baseline
                    # embedding to compare against; a record
                    # with no stored embedding has no identity
                    # to protect yet, so a non-duplicate face
                    # is allowed to seed one.
                    if self_distance is not None:

                        raise PersonUpdateError(
                            "This photo does not match the "
                            "enrolled person."
                        )

                # ----------------------------------------------
                # SAVE NEW PHOTO
                # ----------------------------------------------

                new_photo_path = (
                    save_person_photo(
                        image
                    )
                )

                old_photo_path = (
                    person.photo_path
                )

            # ==================================================
            # CHECK ACTUAL CHANGES
            # ==================================================

            name_changed = (
                final_name
                != person.name
            )

            identifier_changed = (
                final_identifier
                != person.identifier
            )

            photo_changed = (
                embedding is not None
            )

            if not (
                name_changed
                or identifier_changed
                or photo_changed
            ):

                raise PersonUpdateError(
                    "No changes were provided."
                )

            # ==================================================
            # UPDATE DATABASE
            # ==================================================

            updated_person = (
                self.person_repository
                .update_person(
                    person_id=person_id,
                    name=final_name,
                    identifier=
                        final_identifier,
                    embedding=embedding,
                    photo_path=
                        new_photo_path,
                )
            )

            if updated_person is None:

                raise PersonUpdateError(
                    "Person not found."
                )

            # ==================================================
            # RECORD EDIT ACTIVITY
            # ==================================================

            self.person_activity_service.record_edited(
                person_id=
                    updated_person.id,
                person_name=
                    updated_person.name,
                performed_by=
                    performed_by,
            )

            # ==================================================
            # COMMIT
            # ==================================================

            self.person_repository.db.commit()

            # ==================================================
            # DELETE OLD PHOTO
            #
            # Only after the database transaction succeeds.
            # ==================================================

            if (
                photo_changed
                and old_photo_path
                and old_photo_path
                != new_photo_path
            ):

                delete_person_photo(
                    old_photo_path
                )

            return updated_person

        except PersonUpdateError:

            self.person_repository.db.rollback()

            # New photo was saved but the database
            # update failed. Remove the new file.
            if new_photo_path:

                delete_person_photo(
                    new_photo_path
                )

            raise

        except Exception:

            self.person_repository.db.rollback()

            # New photo was saved but something
            # unexpected failed.
            if new_photo_path:

                delete_person_photo(
                    new_photo_path
                )

            raise PersonUpdateError(
                "Failed to update person."
            )

    # =========================================================
    # LIST / LOOKUP
    # =========================================================

    def list_persons(
        self,
    ):

        return (
            self.person_repository
            .get_all_persons()
        )

    def get_person(
        self,
        person_id: int,
    ):

        return (
            self.person_repository
            .get_person_by_id(
                person_id
            )
        )

    def get_latest_person_activity(
        self,
    ):

        return (
            self.person_activity_service
            .get_latest_activity()
        )

    # =========================================================
    # DELETE
    #
    # Mirrors the previous route-level orchestration:
    #   look up -> capture name -> delete (the repository
    #   cascades the recognition events and commits) -> record
    #   the "deleted" activity -> commit that row.
    # =========================================================

    def delete_person(
        self,
        person_id: int,
        performed_by: int,
    ) -> bool:

        person = (
            self.person_repository
            .get_person_by_id(
                person_id
            )
        )

        if person is None:
            return False

        person_name = person.name

        deleted = (
            self.person_repository
            .delete_person(
                person_id
            )
        )

        if not deleted:
            return False

        self.person_activity_service.record_deleted(
            person_id=person_id,
            person_name=person_name,
            performed_by=performed_by,
        )

        self.person_repository.db.commit()

        return True