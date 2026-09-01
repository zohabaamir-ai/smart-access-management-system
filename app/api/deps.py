"""Centralised FastAPI dependency providers.

Every ``get_*_service`` factory that was previously copy-pasted into the
individual route modules now lives here, constructed identically. The
single expensive ``FaceModel`` is instantiated once, eagerly, and shared
by the enrollment / person / recognition services (previously each of
``person_routes`` and ``recognition_routes`` built its own).

``get_db`` is re-exported so route modules have one import location for
request-scoped dependencies.
"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.face_model import FaceModel

from app.repositories.admin_repository import AdminRepository
from app.repositories.camera_repository import CameraRepository
from app.repositories.person_activity_repository import PersonActivityRepository
from app.repositories.person_repository import PersonRepository
from app.repositories.recognition_event_repository import RecognitionEventRepository
from app.repositories.system_setting_repository import SystemSettingRepository

from app.services.activity_service import ActivityService
from app.services.auth_service import AuthService
from app.services.camera_service import CameraService
from app.services.dashboard_service import DashboardService
from app.services.enrollment_service import EnrollmentService
from app.services.person_activity_service import PersonActivityService
from app.services.person_service import PersonService
from app.services.recognition_service import RecognitionService
from app.services.system_setting_service import SystemSettingService

__all__ = [
    "get_db",
    "face_model",
    "get_activity_service",
    "get_auth_service",
    "get_camera_service",
    "get_dashboard_service",
    "get_enrollment_service",
    "get_person_service",
    "get_recognition_service",
    "get_system_setting_service",
]


# --- shared heavy singletons ---------------------------------------------

# Eager, process-wide. Replaces the two separate FaceModel() instances
# that used to be created at import in person_routes and recognition_routes.
face_model = FaceModel()


# --- service providers --------------------------------------------------

def get_activity_service(
    db: Session = Depends(get_db),
) -> ActivityService:

    return ActivityService(
        recognition_event_repository=RecognitionEventRepository(db),
    )


def get_auth_service(
    db: Session = Depends(get_db),
) -> AuthService:

    return AuthService(
        admin_repository=AdminRepository(db),
    )


def get_dashboard_service(
    db: Session = Depends(get_db),
) -> DashboardService:

    return DashboardService(
        person_repository=PersonRepository(db),
        recognition_event_repository=RecognitionEventRepository(db),
    )


def get_enrollment_service(
    db: Session = Depends(get_db),
) -> EnrollmentService:

    person_repository = PersonRepository(db)

    person_activity_service = PersonActivityService(
        person_activity_repository=PersonActivityRepository(db),
    )

    return EnrollmentService(
        face_model=face_model,
        person_repository=person_repository,
        person_activity_service=person_activity_service,
        system_setting_service=SystemSettingService(
            system_setting_repository=SystemSettingRepository(db),
        ),
    )


def get_person_service(
    db: Session = Depends(get_db),
) -> PersonService:

    person_repository = PersonRepository(db)

    person_activity_service = PersonActivityService(
        person_activity_repository=PersonActivityRepository(db),
    )

    return PersonService(
        face_model=face_model,
        person_repository=person_repository,
        person_activity_service=person_activity_service,
        system_setting_service=SystemSettingService(
            system_setting_repository=SystemSettingRepository(db),
        ),
    )


def get_recognition_service(
    db: Session = Depends(get_db),
) -> RecognitionService:

    person_repository = PersonRepository(db)

    recognition_event_repository = RecognitionEventRepository(db)

    return RecognitionService(
        face_model=face_model,
        person_repository=person_repository,
        recognition_event_repository=recognition_event_repository,
        system_setting_service=SystemSettingService(
            system_setting_repository=SystemSettingRepository(db),
        ),
    )


def get_camera_service(
    db: Session = Depends(get_db),
) -> CameraService:

    return CameraService(
        camera_repository=CameraRepository(db),
    )


def get_system_setting_service(
    db: Session = Depends(get_db),
) -> SystemSettingService:

    return SystemSettingService(
        system_setting_repository=SystemSettingRepository(db),
    )
