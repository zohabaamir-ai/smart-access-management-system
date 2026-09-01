from datetime import datetime

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.db.db_models.admin import Admin


class AdminRepository:

    def __init__(
        self,
        db: Session,
    ):
        self.db = db

    # =========================================================
    # LOOKUP
    # =========================================================

    def get_by_username(
        self,
        username: str,
    ) -> Admin | None:

        return (
            self.db.query(Admin)
            .filter(
                Admin.username == username
            )
            .first()
        )

    def get_by_id(
        self,
        admin_id: int,
    ) -> Admin | None:

        return (
            self.db.query(Admin)
            .filter(
                Admin.id == admin_id
            )
            .first()
        )

    # =========================================================
    # LOGIN SECURITY
    #
    # The failed-attempt counter and the lockout counter are
    # mutated with single-statement ``UPDATE ... SET col = col + 1``
    # so concurrent failed logins cannot lose an increment
    # (no read-modify-write in Python).
    # =========================================================

    def increment_failed_login_attempts(
        self,
        admin_id: int,
    ) -> int:
        """Atomically add 1 to ``failed_login_attempts`` and return
        the new value."""

        new_value = self.db.execute(
            update(Admin)
            .where(Admin.id == admin_id)
            .values(
                failed_login_attempts=(
                    Admin.failed_login_attempts + 1
                ),
            )
            .returning(
                Admin.failed_login_attempts
            )
        ).scalar_one()

        self.db.commit()

        return new_value

    def bump_lockout_count(
        self,
        admin_id: int,
    ) -> int:
        """Atomically add 1 to ``lockout_count`` and return the new
        value. Drives progressive lockout duration."""

        new_value = self.db.execute(
            update(Admin)
            .where(Admin.id == admin_id)
            .values(
                lockout_count=(
                    Admin.lockout_count + 1
                ),
            )
            .returning(
                Admin.lockout_count
            )
        ).scalar_one()

        self.db.commit()

        return new_value

    def apply_temporary_lock(
        self,
        admin_id: int,
        locked_until: datetime,
    ) -> None:
        """Set the temporary-lock expiry and zero the failed-attempt
        counter so a fresh window starts once the lock elapses.

        ``lockout_count`` and ``is_active`` are deliberately left
        untouched: a failed-login lockout is temporary and must never
        permanently disable the account.
        """

        self.db.execute(
            update(Admin)
            .where(Admin.id == admin_id)
            .values(
                locked_until=locked_until,
                failed_login_attempts=0,
            )
        )

        self.db.commit()

    def clear_login_security(
        self,
        admin_id: int,
        *,
        reset_lockout_count: bool,
    ) -> None:
        """Clear failed-attempt state.

        * successful login  -> ``reset_lockout_count=True``  (the bad
          streak is over; the next lockout starts again at 15 min).
        * expired lock      -> ``reset_lockout_count=False`` (escalation
          persists so repeated lockouts keep getting longer).
        """

        values = {
            "failed_login_attempts": 0,
            "locked_until": None,
        }

        if reset_lockout_count:
            values["lockout_count"] = 0

        self.db.execute(
            update(Admin)
            .where(Admin.id == admin_id)
            .values(**values)
        )

        self.db.commit()

    def unlock_temporarily_locked_account(
        self,
        admin: Admin,
    ) -> Admin:
        """Management-initiated unlock: full clean slate."""

        admin.failed_login_attempts = 0
        admin.lockout_count = 0
        admin.locked_until = None

        self.db.commit()
        self.db.refresh(admin)

        return admin

    # =========================================================
    # PROFILE
    # =========================================================

    def update_display_name(
        self,
        admin: Admin,
        display_name: str,
    ) -> Admin:

        admin.display_name = display_name

        self.db.commit()
        self.db.refresh(admin)

        return admin

    def update_profile_image(
        self,
        admin: Admin,
        profile_image_url: str,
    ) -> Admin:

        admin.profile_image_url = (
            profile_image_url
        )

        self.db.commit()
        self.db.refresh(admin)

        return admin

    # =========================================================
    # PASSWORD
    # =========================================================

    def update_password(
        self,
        admin: Admin,
        password_hash: str,
    ) -> Admin:
        """Administrative password reset.

        Bumps ``token_version`` in the same UPDATE so the target's
        existing tokens are invalidated together with the password
        change; the temporary-password / ``must_change_password`` flow
        is preserved.
        """

        admin.password_hash = password_hash
        admin.must_change_password = True
        admin.token_version = Admin.token_version + 1

        self.db.commit()
        self.db.refresh(admin)

        return admin

    # =========================================================
    # USER CREATION
    # =========================================================

    def create_admin(
        self,
        full_name: str,
        username: str,
        password_hash: str,
        role: str,
        display_name: str | None = None,
    ) -> Admin:

        admin = Admin(
            full_name=full_name,
            # V1 account creation collects a single name; Display Name
            # defaults to it and is changed later via the profile.
            display_name=display_name or full_name,
            username=username,
            password_hash=password_hash,
            role=role,
            is_active=True,
            failed_login_attempts=0,
            locked_until=None,
            must_change_password=True,
        )

        self.db.add(admin)
        self.db.commit()
        self.db.refresh(admin)

        return admin

    def username_exists(
        self,
        username: str,
    ) -> bool:

        return (
            self.db.query(Admin)
            .filter(
                Admin.username == username
            )
            .first()
            is not None
        )

    # =========================================================
    # USER MANAGEMENT
    # =========================================================

    def get_all_admins(
        self,
    ) -> list[Admin]:

        return (
            self.db.query(Admin)
            .order_by(
                Admin.id.asc()
            )
            .all()
        )

    def update_status(
        self,
        admin: Admin,
        is_active: bool,
    ) -> Admin:
        """Explicit enable / disable by an authorized manager.

        Disable: bump ``token_version`` in the same UPDATE so every
        token already issued for the account stops working immediately.

        Enable: clear stale temporary-lock / failed-attempt state
        (B5 finding) so the account is not left instantly re-locked by
        an old lockout. ``token_version`` is left alone — the disable
        that preceded this already invalidated the old tokens, and a
        clean re-enable should not gratuitously break a fresh login.
        Password, ``must_change_password`` and role are untouched.
        """

        admin.is_active = is_active

        if is_active:
            admin.failed_login_attempts = 0
            admin.lockout_count = 0
            admin.locked_until = None
        else:
            admin.token_version = Admin.token_version + 1

        self.db.commit()
        self.db.refresh(admin)

        return admin

    def update_role(
        self,
        admin: Admin,
        role: str,
    ) -> Admin:
        """Role change by a Super Admin.

        A role change is an authorization-state change: bump
        ``token_version`` in the same UPDATE so tokens minted under the
        old role cannot keep being used.
        """

        admin.role = role
        admin.token_version = Admin.token_version + 1

        self.db.commit()
        self.db.refresh(admin)

        return admin

    def update_identity_fields(
        self,
        admin: Admin,
        *,
        full_name: str | None = None,
        display_name: str | None = None,
    ) -> Admin:
        """Managed edit of another user's name fields.

        Only the fields explicitly passed are written. ``username``,
        ``role``, password and security state are NOT reachable here —
        that is the point of a narrow method rather than a mass-assign.
        Names are not security state, so ``token_version`` is untouched.
        """

        if full_name is not None:
            admin.full_name = full_name

        if display_name is not None:
            admin.display_name = display_name

        self.db.commit()
        self.db.refresh(admin)

        return admin

    def delete_admin(
        self,
        admin: Admin,
    ) -> None:

        self.db.delete(admin)
        self.db.commit()

    def count_super_admins(
        self,
        active_only: bool = False,
    ) -> int:

        query = (
            self.db.query(Admin)
            .filter(Admin.role == "super_admin")
        )

        if active_only:
            query = query.filter(
                Admin.is_active.is_(True)
            )

        return query.count()