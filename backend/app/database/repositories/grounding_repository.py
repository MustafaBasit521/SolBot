import uuid

from app.models.grounding_session import GroundingSession
from sqlalchemy.orm import Session


def create_session(db: Session, *, user_id: uuid.UUID, pre_intensity: int) -> GroundingSession:
    session = GroundingSession(user_id=user_id, pre_intensity=pre_intensity)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session(db: Session, session_id: uuid.UUID) -> GroundingSession | None:
    return db.get(GroundingSession, session_id)


def complete_session(
    db: Session,
    session: GroundingSession,
    *,
    post_intensity: int | None,
    completed: bool,
) -> GroundingSession:
    session.post_intensity = post_intensity
    session.completed = completed
    db.commit()
    db.refresh(session)
    return session
