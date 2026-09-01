from datetime import datetime

from pydantic import BaseModel


class LoginRequest(BaseModel):

    username: str

    password: str


class LoginUser(BaseModel):

    id: int

    full_name: str

    display_name: str

    username: str

    role: str


class LoginResponse(BaseModel):

    access_token: str

    token_type: str

    must_change_password: bool

    user: LoginUser


class ChangePasswordRequest(BaseModel):

    current_password: str

    new_password: str

    confirm_password: str


class ChangePasswordResponse(BaseModel):

    message: str

    access_token: str

    token_type: str


# =============================================================
# PROFILE
# =============================================================

class ProfileResponse(BaseModel):

    id: int

    full_name: str

    display_name: str

    username: str

    role: str

    profile_image_url: str | None = None


# =============================================================
# USER MANAGEMENT
# =============================================================

class CreateUserRequest(BaseModel):

    full_name: str

    username: str

    role: str = "operator"

    # Optional. Defaults to full_name when omitted.
    display_name: str | None = None


class UpdateUserRequest(BaseModel):
    """Managed edit of another user's name fields only.

    Neither ``username`` nor ``role`` nor any security field is
    accepted here — those have dedicated endpoints.
    """

    full_name: str | None = None

    display_name: str | None = None


class CreateUserResponse(BaseModel):

    id: int

    full_name: str

    username: str

    role: str

    temporary_password: str


class AdminResponse(BaseModel):

    id: int

    full_name: str

    display_name: str

    username: str

    role: str

    profile_image_url: str | None = None

    is_active: bool

    must_change_password: bool

    created_at: datetime
