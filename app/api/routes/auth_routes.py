from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    File,
    Form,
    UploadFile,
)

from app.db.db_models.admin import Admin

from app.services.auth_service import (
    AuthService,
)

from app.services.profile_image_service import (
    ProfileImageService,
)

from app.schemas.auth_schemas import (
    LoginRequest,
    LoginResponse,
    LoginUser,
    ChangePasswordRequest,
    ChangePasswordResponse,
    ProfileResponse,
)

from app.api.auth_dependencies import (
    get_authenticating_admin,
    get_current_admin,
)

from app.api.deps import get_auth_service


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# =============================================================
# LOGIN
# =============================================================

@router.post(
    "/login",
    response_model=LoginResponse,
)
async def login(
    credentials: LoginRequest,
    service: AuthService = Depends(
        get_auth_service
    ),
):

    try:

        admin = service.authenticate_admin(
            username=credentials.username,
            password=credentials.password,
        )

    except HTTPException as exc:

        raise exc

    if admin is None:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": (
                    "Invalid username or password."
                ),
            },
        )

    access_token = (
        service.create_access_token(admin)
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        must_change_password=(
            admin.must_change_password
        ),
        user=LoginUser(
            id=admin.id,
            full_name=admin.full_name,
            display_name=admin.display_name,
            username=admin.username,
            role=admin.role,
        ),
    )


# =============================================================
# PROFILE
#
# GET is reachable with ``must_change_password`` outstanding so the
# forced-change screen can greet the user; PATCH is normal system
# access and stays behind ``get_current_admin``.
# =============================================================

@router.get(
    "/profile",
    response_model=ProfileResponse,
)
async def get_profile(
    current_admin: Admin = Depends(
        get_authenticating_admin
    ),
):

    return ProfileResponse(
        id=current_admin.id,
        full_name=current_admin.full_name,
        display_name=current_admin.display_name,
        username=current_admin.username,
        role=current_admin.role,
        profile_image_url=(
            current_admin.profile_image_url
        ),
    )


@router.patch(
    "/profile",
    response_model=ProfileResponse,
)
async def update_profile(
    display_name: str | None = Form(default=None),
    # Back-compat alias for clients that still send ``full_name`` as the
    # profile name field. It updates the Display Name, never the
    # original ``full_name`` (which is not self-editable in V1).
    full_name: str | None = Form(default=None),
    profile_image: UploadFile | None = File(
        default=None
    ),
    service: AuthService = Depends(
        get_auth_service
    ),
    current_admin: Admin = Depends(
        get_current_admin
    ),
):

    new_display_name = (
        display_name
        if display_name is not None
        else full_name
    )

    admin = service.update_profile(
        admin_id=current_admin.id,
        display_name=new_display_name or "",
    )

    if profile_image is not None:

        image_url = (
            await ProfileImageService
            .save_profile_image(
                profile_image
            )
        )

        admin = (
            service.update_profile_image(
                admin_id=admin.id,
                profile_image_url=image_url,
            )
        )

    return ProfileResponse(
        id=admin.id,
        full_name=admin.full_name,
        display_name=admin.display_name,
        username=admin.username,
        role=admin.role,
        profile_image_url=(
            admin.profile_image_url
        ),
    )


# =============================================================
# CHANGE PASSWORD
# =============================================================

@router.post(
    "/change-password",
    response_model=ChangePasswordResponse,
)
async def change_password(
    request: ChangePasswordRequest,
    service: AuthService = Depends(
        get_auth_service
    ),
    current_admin: Admin = Depends(
        get_authenticating_admin
    ),
):

    admin = service.change_password(
        admin_id=current_admin.id,
        current_password=request.current_password,
        new_password=request.new_password,
        confirm_password=request.confirm_password,
    )

    access_token = (
        service.create_access_token(admin)
    )

    return ChangePasswordResponse(
        message="Password changed successfully.",
        access_token=access_token,
        token_type="bearer",
    )