import uuid

from sqlalchemy.orm import Session

from app.models.user import User


def create_user(
    db: Session, *, email: str, hashed_password: str, display_name: str | None = None
) -> User:
    user = User(email=email, hashed_password=hashed_password, display_name=display_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()
