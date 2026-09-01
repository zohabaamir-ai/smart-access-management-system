from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)

from pathlib import Path

from fastapi.responses import FileResponse

from app.db.db_models.admin import Admin

from app.core.permissions import Permission

from app.services.enrollment_service import (
    EnrollmentService,
)

from app.services.person_service import (
    PersonService,
    PersonUpdateError,
)

from app.schemas.enrollment_schemas import (
    EnrollmentError,
    EnrollmentResponse,
)

from app.schemas.person_schemas import (
    PersonResponse,
)

from app.api.auth_dependencies import (
    require_permission,
)

from app.api.deps import (
    get_enrollment_service,
    get_person_service,
)

from app.api.uploads import decode_image_upload


router = APIRouter(
    prefix="/persons",
    tags=["Persons"],
)


# =============================================================
# PERSON RESPONSE
#
# V1: every management role sees the full Person record
# (name, CNIC, photo). No role-based privacy masking.
# =============================================================

def _person_response(person) -> PersonResponse:
    return PersonResponse.model_validate(person)


# =============================================================
# ENROLL
# =============================================================

@router.post(
    "/enroll",
    response_model=EnrollmentResponse,
)
async def enroll_person(
    name: str = Form(...),
    identifier: str = Form(...),
    file: UploadFile = File(...),
    service: EnrollmentService = Depends(
        get_enrollment_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.MANAGE_PERSONS
        )
    ),
):
    image = await decode_image_upload(file)

    try:
        return service.enroll_person(
            name=name.strip(),
            identifier=identifier.strip(),
            image=image,
            performed_by=current_admin.id,
        )

    except EnrollmentError as e:
        raise HTTPException(
            status_code=400,
            detail=e.reason,
        )


# =============================================================
# GET PERSONS
# =============================================================

@router.get(
    "",
    response_model=list[PersonResponse],
)
async def get_persons(
    service: PersonService = Depends(
        get_person_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.VIEW_PERSONS
        )
    ),
):

    persons = service.list_persons()

    return [
        _person_response(person)
        for person in persons
    ]


# =============================================================
# RECENT ACTIVITY
# =============================================================

@router.get(
    "/activity/recent",
)
async def get_recent_person_activity(
    service: PersonService = Depends(
        get_person_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.VIEW_PERSONS
        )
    ),
):

    activity = (
        service.get_latest_person_activity()
    )

    if activity is None:
        return None

    return {
        "id": activity.id,
        "person_id": activity.person_id,
        "person_name":
            activity.person_name,
        "action": activity.action,
        "performed_by":
            activity.performed_by,
        "timestamp":
            activity.timestamp,
    }


# =============================================================
# VIEW PERSON PHOTO
# =============================================================

@router.get(
    "/{person_id}/photo",
)
async def get_person_photo(
    person_id: int,
    service: PersonService = Depends(
        get_person_service
    ),
    current_admin: Admin = Depends(
        require_permission(
            Permission.VIEW_PERSONS
        )
    ),
):
    person = service.get_person(
        person_id
    )

    if person is None:
        raise HTTPException(
            status_code=404,
            detail="Person not found.",
        )

    if not person.photo_path:
        raise HTTPException(
            status_code=404,
            detail="Person photo not found.",
        )

    photo_path = Path(
        person.photo_path
    )

    if not photo_path.is_absolute():
        photo_path = (
            Path.cwd()
            / photo_path
        )

    if not photo_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Person photo file not found.",
        )

    return FileResponse(
        path=photo_path,
    )


# =============================================================
# UPDATE PERSON
# =============================================================

@router.patch(
    "/{person_id}",
    response_model=PersonResponse,
)
async def update_person(
    person_id: int,

    name: str | None = Form(
        None
    ),

    identifier: str | None = Form(
        None
    ),

    file: UploadFile | None =
        File(None),

    service: PersonService = Depends(
        get_person_service
    ),

    current_admin: Admin = Depends(
        require_permission(
            Permission.EDIT_PERSONS
        )
    ),
):

    image = None

    if file is not None:

        image = await decode_image_upload(file)

    try:

        person = (
            service.update_person(
                person_id=
                    person_id,
                name=name,
                identifier=
                    identifier,
                image=image,
                performed_by=
                    current_admin.id,
            )
        )

    except PersonUpdateError as e:

        raise HTTPException(
            status_code=400,
            detail=e.reason,
        )

    return _person_response(person)


# =============================================================
# DELETE PERSON
# =============================================================

@router.delete(
    "/{person_id}",
)
async def delete_person(
    person_id: int,

    service: PersonService = Depends(
        get_person_service
    ),

    current_admin: Admin = Depends(
        require_permission(
            Permission.DELETE_PERSONS
        )
    ),
):

    deleted = (
        service.delete_person(
            person_id=person_id,
            performed_by=current_admin.id,
        )
    )

    if not deleted:

        raise HTTPException(
            status_code=404,
            detail="Person not found.",
        )

    return {
        "message":
            "Person deleted successfully.",
        "person_id":
            person_id,
    }
