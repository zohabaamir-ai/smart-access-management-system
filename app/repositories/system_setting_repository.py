from sqlalchemy.orm import Session

from app.db.db_models.system_setting import (
    SystemSetting,
)


class SystemSettingRepository:

    def __init__(
        self,
        db: Session,
    ):
        self.db = db

    def get_all(
        self,
    ) -> list[SystemSetting]:

        return (
            self.db.query(SystemSetting)
            .all()
        )

    def get(
        self,
        key: str,
    ) -> SystemSetting | None:

        return (
            self.db.query(SystemSetting)
            .filter(
                SystemSetting.key == key
            )
            .first()
        )

    def upsert(
        self,
        key: str,
        value: str,
        updated_by: int | None,
        *,
        commit: bool = True,
    ) -> SystemSetting:
        """Insert or update one setting row.

        ``commit=False`` stages the change (flush only) so the service
        can validate and write several keys under a single commit.
        """

        setting = self.get(key)

        if setting is None:
            setting = SystemSetting(
                key=key,
                value=value,
                updated_by=updated_by,
            )
            self.db.add(setting)

        else:
            setting.value = value
            setting.updated_by = updated_by

        if commit:
            self.db.commit()
            self.db.refresh(setting)
        else:
            self.db.flush()

        return setting
