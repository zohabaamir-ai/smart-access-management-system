from datetime import datetime, timedelta, timezone
import secrets
import string

import jwt
from fastapi import HTTPException
from pwdlib import PasswordHash

from app.core.config import (
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES as ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_ALGORITHM as ALGORITHM,
    JWT_SECRET_KEY as SECRET_KEY,
)
from app.db.db_models.admin import Admin


MAX_FAILED_LOGIN_ATTEMPTS = 5

# Progressive temporary lockout (B5).
#
# The Nth lockout of a bad streak lasts LOCKOUT_DURATIONS_MINUTES[N-1];
# the last value is a cap for the 4th lockout onward. Values escalate
# but the account is NEVER permanently disabled by this mechanism.
#
#   lockout #1 -> 15 min
#   lockout #2 -> 30 min
#   lockout #3 -> 60 min
#   lockout #4+ -> 120 min
#
# The streak (``admins.lockout_count``) resets to 0 on the next
# successful login.
LOCKOUT_DURATIONS_MINUTES = (15, 30, 60, 120)

# Kept for backwards compatibility / readability: the first lockout.
TEMPORARY_LOCK_MINUTES = LOCKOUT_DURATIONS_MINUTES[0]

# Identical body for every "the credentials did not work" outcome —
# unknown username, wrong password, or a disabled account probed
# without the real password — so login cannot be used to enumerate
# usernames.
_GENERIC_AUTH_FAILURE_DETAIL = {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password.",
}


def lockout_duration_minutes(lockout_count: int) -> int:
    """Minutes the ``lockout_count``-th temporary lockout should last."""

    index = min(
        max(lockout_count, 1),
        len(LOCKOUT_DURATIONS_MINUTES),
    ) - 1

    return LOCKOUT_DURATIONS_MINUTES[index]


if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not configured."
    )


class AuthService:

    def __init__(
        self,
        admin_repository,
    ):
        self.admin_repository = (
            admin_repository
        )

        self.password_hash = (
            PasswordHash.recommended()
        )

        # Verified against when the username does not exist, so an
        # unknown username costs the same wall-clock time as a real
        # one and cannot be told apart by timing.
        self._dummy_password_hash = (
            self.password_hash.hash(
                "timing-equalization-placeholder"
            )
        )

    # =========================================================
    # AUTHENTICATION
    # =========================================================

    def authenticate_admin(
        self,
        username: str,
        password: str,
    ) -> Admin | None:
        """Return the Admin on success, ``None`` on a plain credential
        failure. Raises 423 (temporarily locked) / 403 (administratively
        disabled) for the two states that a caller who has proven
        ownership of the account is allowed to learn about.

        Enumeration safety: an unknown username, a wrong password, and a
        disabled account probed without the real password all cost the
        same time and produce the same ``None`` -> generic 401.
        """

        admin = (
            self.admin_repository
            .get_by_username(username)
        )

        # -----------------------------------------------------
        # UNKNOWN USERNAME
        #
        # Still run a hash verification against a throwaway hash so
        # the response time matches a real account.
        # -----------------------------------------------------

        if admin is None:
            self.password_hash.verify(
                password,
                self._dummy_password_hash,
            )
            return None

        # -----------------------------------------------------
        # ADMINISTRATIVELY DISABLED
        #
        # Only revealed to a caller who supplies the correct
        # password; otherwise indistinguishable from a wrong
        # password on any account.
        # -----------------------------------------------------

        if not admin.is_active:

            if self.password_hash.verify(
                password,
                admin.password_hash,
            ):
                raise HTTPException(
                    status_code=403,
                    detail={
                        "code": "ACCOUNT_ADMINISTRATIVELY_DISABLED",
                        "message": (
                            "This account has been disabled "
                            "by an administrator."
                        ),
                    },
                )

            return None

        # -----------------------------------------------------
        # TEMPORARY LOCK
        # -----------------------------------------------------

        now = datetime.now(
            timezone.utc
        )

        if admin.locked_until is not None:

            locked_until = admin.locked_until

            if locked_until.tzinfo is None:
                locked_until = (
                    locked_until.replace(
                        tzinfo=timezone.utc
                    )
                )

            if locked_until > now:
                raise HTTPException(
                    status_code=423,
                    detail={
                        "code": "ACCOUNT_TEMPORARILY_LOCKED",
                        "message": (
                            "Account temporarily locked."
                        ),
                        "locked_until": (
                            locked_until.isoformat()
                        ),
                    },
                )

            # Lock elapsed: clear the failed-attempt state but keep
            # the escalation streak so the next lockout is longer.
            self.admin_repository.clear_login_security(
                admin.id,
                reset_lockout_count=False,
            )
            admin = (
                self.admin_repository
                .get_by_id(admin.id)
            )

        # -----------------------------------------------------
        # PASSWORD VERIFICATION
        # -----------------------------------------------------

        if not self.password_hash.verify(
            password,
            admin.password_hash,
        ):

            new_attempts = (
                self.admin_repository
                .increment_failed_login_attempts(
                    admin.id
                )
            )

            if (
                new_attempts
                >= MAX_FAILED_LOGIN_ATTEMPTS
            ):

                new_lockout_count = (
                    self.admin_repository
                    .bump_lockout_count(admin.id)
                )

                locked_until = now + timedelta(
                    minutes=lockout_duration_minutes(
                        new_lockout_count
                    ),
                )

                self.admin_repository.apply_temporary_lock(
                    admin_id=admin.id,
                    locked_until=locked_until,
                )

                raise HTTPException(
                    status_code=423,
                    detail={
                        "code": "ACCOUNT_TEMPORARILY_LOCKED",
                        "message": (
                            "Account temporarily locked "
                            "after too many unsuccessful "
                            "login attempts."
                        ),
                        "locked_until": (
                            locked_until.isoformat()
                        ),
                    },
                )

            return None

        # -----------------------------------------------------
        # SUCCESSFUL LOGIN — end the bad streak entirely.
        # -----------------------------------------------------

        if (
            admin.failed_login_attempts
            or admin.lockout_count
            or admin.locked_until is not None
        ):
            self.admin_repository.clear_login_security(
                admin.id,
                reset_lockout_count=True,
            )
            admin = (
                self.admin_repository
                .get_by_id(admin.id)
            )

        return admin

    # =========================================================
    # ACCESS TOKEN
    # =========================================================

    def create_access_token(
        self,
        admin: Admin,
    ) -> str:

        expire = (
            datetime.now(
                timezone.utc
            )
            + timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )

        # ``token_version`` is the only claim treated as authoritative
        # about the token itself. ``role`` / ``username`` /
        # ``must_change_password`` are informational — the database row
        # is authoritative for current account state.
        payload = {
            "sub": str(admin.id),
            "username": admin.username,
            "role": admin.role,
            "must_change_password": (
                admin.must_change_password
            ),
            "token_version": admin.token_version,
            "exp": expire,
        }

        return jwt.encode(
            payload,
            SECRET_KEY,
            algorithm=ALGORITHM,
        )

    # =========================================================
    # PROFILE
    # =========================================================

    def get_profile(
        self,
        admin_id: int,
    ) -> Admin:

        admin = (
            self.admin_repository
            .get_by_id(admin_id)
        )

        if admin is None:
            raise HTTPException(
                status_code=404,
                detail="Admin account not found.",
            )

        if not admin.is_active:
            raise HTTPException(
                status_code=403,
                detail="This account is disabled.",
            )

        return admin

    def update_profile(
        self,
        admin_id: int,
        display_name: str,
    ) -> Admin:
        """Update the user's Display Name only.

        Original name (``full_name``), ``username`` and ``role`` are not
        touched here — Display Name is a distinct, self-editable field.
        """

        admin = self.get_profile(
            admin_id
        )

        display_name = display_name.strip()

        if not display_name:
            raise HTTPException(
                status_code=400,
                detail="Display name is required.",
            )

        if len(display_name) > 100:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Display name must be "
                    "100 characters or less."
                ),
            )

        return (
            self.admin_repository
            .update_display_name(
                admin=admin,
                display_name=display_name,
            )
        )

    def update_profile_image(
        self,
        admin_id: int,
        profile_image_url: str,
    ) -> Admin:

        admin = self.get_profile(
            admin_id
        )

        return (
            self.admin_repository
            .update_profile_image(
                admin=admin,
                profile_image_url=profile_image_url,
            )
        )

    # =========================================================
    # PASSWORD
    # =========================================================

    def change_password(
        self,
        admin_id: int,
        current_password: str,
        new_password: str,
        confirm_password: str,
    ) -> Admin:

        admin = (
            self.admin_repository
            .get_by_id(admin_id)
        )

        if admin is None:
            raise HTTPException(
                status_code=404,
                detail="Admin account not found.",
            )

        if not admin.is_active:
            raise HTTPException(
                status_code=403,
                detail="This account is disabled.",
            )

        if not self.password_hash.verify(
            current_password,
            admin.password_hash,
        ):
            raise HTTPException(
                status_code=400,
                detail="Current password is incorrect.",
            )

        if (
            new_password
            != confirm_password
        ):
            raise HTTPException(
                status_code=400,
                detail="New passwords do not match.",
            )

        if len(new_password) < 8:
            raise HTTPException(
                status_code=400,
                detail=(
                    "New password must be at least "
                    "8 characters long."
                ),
            )

        if self.password_hash.verify(
            new_password,
            admin.password_hash,
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "New password must be different "
                    "from the current password."
                ),
            )

        password_hash = (
            self.password_hash.hash(
                new_password
            )
        )

        admin.password_hash = (
            password_hash
        )

        admin.must_change_password = False

        # Invalidate every token issued before this change. The
        # increment is a DB-side expression, so the new hash, the
        # flag, and the version bump all land in one UPDATE / one
        # commit — the password can never change without the token
        # version advancing with it.
        admin.token_version = (
            Admin.token_version + 1
        )

        self.admin_repository.db.commit()
        self.admin_repository.db.refresh(
            admin
        )

        return admin

    # =========================================================
    # TEMPORARY PASSWORD
    # =========================================================

    def generate_temporary_password(
        self,
        length: int = 12,
    ) -> str:

        characters = (
            string.ascii_letters
            + string.digits
            + "!@#$%^&*"
        )

        return "".join(
            secrets.choice(
                characters
            )
            for _ in range(length)
        )

    # =========================================================
    # USER MANAGEMENT AUTHORIZATION (PERMISSIONS.md → Users)
    #
    # Core rule: no role may create/edit/delete an account with
    # equal or higher privilege than itself.
    #
    #   - Super Admin  -> any account, any role.
    #   - Admin        -> Operator accounts only, and never the
    #                     role field.
    # =========================================================

    KNOWN_ROLES = {
        "super_admin",
        "admin",
        "operator",
    }

    def _assert_can_manage_target(
        self,
        requesting_admin_role: str,
        target_admin: Admin,
    ) -> None:

        if requesting_admin_role == "super_admin":
            return

        if requesting_admin_role == "admin":

            if target_admin.role != "operator":
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Admins may only manage "
                        "Operator accounts."
                    ),
                )

            return

        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to manage users."
            ),
        )

    def _assert_not_last_super_admin(
        self,
        target_admin: Admin,
    ) -> None:

        # The matrix allows a Super Admin to act on "any account",
        # but delete / deactivate / demote must never drain the
        # last usable Super Admin: that would make the
        # super-admin-only surface (system config, Admin
        # management) permanently unreachable.
        if target_admin.role != "super_admin":
            return

        active_super_admins = (
            self.admin_repository
            .count_super_admins(
                active_only=True,
            )
        )

        # Each of these operations removes `target_admin` from the
        # pool of usable Super Admins.
        target_counts_as_active = (
            target_admin.is_active
        )

        remaining_after = active_super_admins - (
            1 if target_counts_as_active else 0
        )

        if remaining_after < 1:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This is the last active Super "
                    "Admin account. Assign another "
                    "Super Admin before removing, "
                    "disabling, or demoting it."
                ),
            )

    # =========================================================
    # USER CREATION
    # =========================================================

    def create_admin(
        self,
        full_name: str,
        username: str,
        role: str,
        creator_role: str,
        display_name: str | None = None,
    ) -> tuple[Admin, str]:

        full_name = full_name.strip()
        username = username.strip()

        if not full_name:
            raise HTTPException(
                status_code=400,
                detail="Full name is required.",
            )

        if not username:
            raise HTTPException(
                status_code=400,
                detail="Username is required.",
            )

        if role not in self.KNOWN_ROLES:
            raise HTTPException(
                status_code=400,
                detail="Invalid user role.",
            )

        # -----------------------------------------------------
        # PRIVILEGE SCOPING (V1 role matrix)
        #   Super Admin -> Admin or Operator.
        #   Admin       -> Operator only.
        #
        # V1 has exactly one Super Admin (the deployment owner); no
        # role may create a second one.
        # -----------------------------------------------------

        if creator_role == "super_admin":
            allowed_roles = {
                "admin",
                "operator",
            }

        elif creator_role == "admin":
            allowed_roles = {
                "operator",
            }

        else:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You do not have permission "
                    "to create users."
                ),
            )

        if role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You cannot create a user "
                    "with this role."
                ),
            )

        if (
            self.admin_repository
            .username_exists(username)
        ):
            raise HTTPException(
                status_code=409,
                detail="Username already exists.",
            )

        display_name = (
            display_name.strip()
            if display_name is not None
            else ""
        )

        if len(display_name) > 100:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Display name must be "
                    "100 characters or less."
                ),
            )

        temporary_password = (
            self.generate_temporary_password()
        )

        password_hash = (
            self.password_hash.hash(
                temporary_password
            )
        )

        admin = (
            self.admin_repository
            .create_admin(
                full_name=full_name,
                username=username,
                password_hash=password_hash,
                role=role,
                display_name=display_name or None,
            )
        )

        return (
            admin,
            temporary_password,
        )

    # =========================================================
    # MANAGED IDENTITY EDIT (Users management -> another account)
    #
    # Narrow, deliberate: only full_name and/or display_name.
    # username, role, password and security state each have their
    # own dedicated flow and are unreachable here.
    # =========================================================

    def update_user_identity(
        self,
        target_admin_id: int,
        requesting_admin_id: int,
        requesting_admin_role: str,
        full_name: str | None = None,
        display_name: str | None = None,
    ) -> Admin:

        admin = (
            self.admin_repository
            .get_by_id(target_admin_id)
        )

        if admin is None:
            raise HTTPException(
                status_code=404,
                detail="User not found.",
            )

        # Super Admin -> any account; Admin -> Operator accounts only.
        self._assert_can_manage_target(
            requesting_admin_role,
            admin,
        )

        clean_full_name = (
            full_name.strip()
            if full_name is not None
            else None
        )
        clean_display_name = (
            display_name.strip()
            if display_name is not None
            else None
        )

        if (
            clean_full_name is None
            and clean_display_name is None
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Provide full_name and/or "
                    "display_name to update."
                ),
            )

        for label, value in (
            ("Full name", clean_full_name),
            ("Display name", clean_display_name),
        ):
            if value is None:
                continue
            if not value:
                raise HTTPException(
                    status_code=400,
                    detail=f"{label} cannot be empty.",
                )
            if len(value) > 100:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"{label} must be "
                        "100 characters or less."
                    ),
                )

        return (
            self.admin_repository
            .update_identity_fields(
                admin=admin,
                full_name=clean_full_name,
                display_name=clean_display_name,
            )
        )

    # =========================================================
    # ADMIN PASSWORD RESET
    # =========================================================

    def reset_admin_password(
        self,
        target_admin_id: int,
        requesting_admin_id: int,
        requesting_admin_role: str,
    ) -> tuple[Admin, str]:

        if (
            target_admin_id
            == requesting_admin_id
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "You cannot reset your own password "
                    "using this function."
                ),
            )

        admin = (
            self.admin_repository
            .get_by_id(
                target_admin_id
            )
        )

        if admin is None:
            raise HTTPException(
                status_code=404,
                detail="User not found.",
            )

        self._assert_can_manage_target(
            requesting_admin_role,
            admin,
        )

        temporary_password = (
            self.generate_temporary_password()
        )

        password_hash = (
            self.password_hash.hash(
                temporary_password
            )
        )

        admin = (
            self.admin_repository
            .update_password(
                admin=admin,
                password_hash=password_hash,
            )
        )

        return (
            admin,
            temporary_password,
        )

    # =========================================================
    # ADMIN STATUS
    # =========================================================

    def update_admin_status(
        self,
        target_admin_id: int,
        requesting_admin_id: int,
        requesting_admin_role: str,
        is_active: bool,
    ) -> Admin:

        if (
            target_admin_id
            == requesting_admin_id
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "You cannot change your own "
                    "account status."
                ),
            )

        admin = (
            self.admin_repository
            .get_by_id(
                target_admin_id
            )
        )

        if admin is None:
            raise HTTPException(
                status_code=404,
                detail="User not found.",
            )

        # PERMISSIONS.md → Users → Delete/deactivate:
        #   Super Admin -> any account.
        #   Admin       -> Operator accounts only.
        self._assert_can_manage_target(
            requesting_admin_role,
            admin,
        )

        if not is_active:
            self._assert_not_last_super_admin(
                admin
            )

        return (
            self.admin_repository
            .update_status(
                admin=admin,
                is_active=is_active,
            )
        )

    # =========================================================
    # ADMIN ROLE
    # =========================================================

    def update_admin_role(
        self,
        target_admin_id: int,
        requesting_admin_id: int,
        requesting_admin_role: str,
        role: str,
    ) -> Admin:

        # V1 role matrix:
        #   only a Super Admin may change roles;
        #   the only permitted moves are Operator <-> Admin;
        #   the Super Admin role can never be assigned or removed.
        if requesting_admin_role != "super_admin":
            raise HTTPException(
                status_code=403,
                detail=(
                    "Only a Super Admin may "
                    "change user roles."
                ),
            )

        if (
            target_admin_id
            == requesting_admin_id
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "You cannot change your own role."
                ),
            )

        if role not in self.KNOWN_ROLES:
            raise HTTPException(
                status_code=400,
                detail="Invalid user role.",
            )

        if role == "super_admin":
            raise HTTPException(
                status_code=403,
                detail=(
                    "The Super Admin role cannot "
                    "be assigned."
                ),
            )

        admin = (
            self.admin_repository
            .get_by_id(
                target_admin_id
            )
        )

        if admin is None:
            raise HTTPException(
                status_code=404,
                detail="User not found.",
            )

        if admin.role == "super_admin":
            raise HTTPException(
                status_code=403,
                detail=(
                    "The Super Admin's role "
                    "cannot be changed."
                ),
            )

        if admin.role == role:
            raise HTTPException(
                status_code=400,
                detail=f"User already has the {role} role.",
            )

        return (
            self.admin_repository
            .update_role(
                admin=admin,
                role=role,
            )
        )

    # =========================================================
    # TEMPORARY ACCOUNT UNLOCK
    # =========================================================

    def unlock_admin_account(
        self,
        target_admin_id: int,
        requesting_admin_id: int,
        requesting_admin_role: str,
    ) -> Admin:

        if (
            target_admin_id
            == requesting_admin_id
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "You cannot unlock your own account "
                    "using this function."
                ),
            )

        admin = (
            self.admin_repository
            .get_by_id(
                target_admin_id
            )
        )

        if admin is None:
            raise HTTPException(
                status_code=404,
                detail="User not found.",
            )

        # Super Admin -> any account; Admin -> Operators only.
        self._assert_can_manage_target(
            requesting_admin_role,
            admin,
        )

        if not admin.is_active:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This account is administratively "
                    "disabled, not temporarily locked."
                ),
            )

        if admin.locked_until is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This account is not temporarily locked."
                ),
            )

        return (
            self.admin_repository
            .unlock_temporarily_locked_account(
                admin
            )
        )

    # =========================================================
    # DELETE USER (PERMISSIONS.md → Users → Delete)
    #
    #   Super Admin -> any account (except self).
    #   Admin       -> Operator accounts only.
    # =========================================================

    def delete_admin(
        self,
        target_admin_id: int,
        requesting_admin_id: int,
        requesting_admin_role: str,
    ) -> Admin:

        if (
            target_admin_id
            == requesting_admin_id
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "You cannot delete your own account."
                ),
            )

        admin = (
            self.admin_repository
            .get_by_id(
                target_admin_id
            )
        )

        if admin is None:
            raise HTTPException(
                status_code=404,
                detail="User not found.",
            )

        self._assert_can_manage_target(
            requesting_admin_role,
            admin,
        )

        self._assert_not_last_super_admin(
            admin
        )

        self.admin_repository.delete_admin(
            admin
        )

        return admin