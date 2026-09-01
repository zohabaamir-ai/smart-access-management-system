from getpass import getpass

from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.db_models.admin import Admin

from pwdlib import PasswordHash


password_hash = PasswordHash.recommended()


def create_admin() -> None:
    full_name = input("Enter admin full name: ").strip()
    username = input("Enter admin username: ").strip()
    password = getpass("Enter admin password: ")

    if not full_name:
        print("Full name cannot be empty.")
        return

    if not username:
        print("Username cannot be empty.")
        return

    if not password:
        print("Password cannot be empty.")
        return

    db: Session = SessionLocal()

    try:
        existing_admin = (
            db.query(Admin)
            .filter(Admin.username == username)
            .first()
        )

        if existing_admin:
            print(f"Admin '{username}' already exists.")
            return

        admin = Admin(
            full_name=full_name,
            username=username,
            password_hash=password_hash.hash(password),
            role="super_admin",
        )

        db.add(admin)
        db.commit()

        print(
            f"Admin '{username}' created successfully."
        )

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()