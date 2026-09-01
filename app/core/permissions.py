from enum import Enum


class Permission(str, Enum):
    VIEW_DASHBOARD = "view_dashboard"

    VIEW_PERSONS = "view_persons"
    MANAGE_PERSONS = "manage_persons"
    EDIT_PERSONS = "edit_persons"
    DELETE_PERSONS = "delete_persons"

    VIEW_ACTIVITY = "view_activity"
    EXPORT_ACTIVITY = "export_activity"

    VIEW_CAMERAS = "view_cameras"
    MANAGE_CAMERAS = "manage_cameras"

    CREATE_USERS = "create_users"
    MANAGE_USERS = "manage_users"

    MANAGE_SETTINGS = "manage_settings"


ROLE_PERMISSIONS = {
    "operator": {
        Permission.VIEW_DASHBOARD,

        Permission.VIEW_PERSONS,
        Permission.MANAGE_PERSONS,

        # Operator monitors recognition Activity but cannot export it.
        Permission.VIEW_ACTIVITY,

        Permission.VIEW_CAMERAS,
    },

    "admin": {
        Permission.VIEW_DASHBOARD,

        Permission.VIEW_PERSONS,
        Permission.MANAGE_PERSONS,
        Permission.DELETE_PERSONS,
        Permission.EDIT_PERSONS,

        Permission.VIEW_ACTIVITY,
        Permission.EXPORT_ACTIVITY,

        Permission.VIEW_CAMERAS,
        Permission.MANAGE_CAMERAS,

        # PERMISSIONS.md → Users: Admin may create Operators and
        # manage (view / reset / block / unlock / delete) Operator
        # accounts only. The coarse permission opens the endpoints;
        # the Operator-only + no-role-change scoping is enforced in
        # AuthService.
        Permission.CREATE_USERS,
        Permission.MANAGE_USERS,
    },

    "super_admin": {
        Permission.VIEW_DASHBOARD,

        Permission.VIEW_PERSONS,
        Permission.MANAGE_PERSONS,
        Permission.DELETE_PERSONS,
        Permission.EDIT_PERSONS,

        Permission.VIEW_ACTIVITY,
        Permission.EXPORT_ACTIVITY,

        Permission.VIEW_CAMERAS,
        Permission.MANAGE_CAMERAS,

        Permission.CREATE_USERS,
        Permission.MANAGE_USERS,
        Permission.MANAGE_SETTINGS,
    },
}


def has_permission(
    role: str,
    permission: Permission,
) -> bool:
    return permission in ROLE_PERMISSIONS.get(
        role,
        set(),
    )