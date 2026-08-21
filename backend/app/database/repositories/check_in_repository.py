import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.check_in import CheckIn


def create_check_in(
    db: Session,
    *,
    user_id: uuid.UUID,
    mood: int,
    stress: int,
    energy: int,
    social_connection: int,
    overall_wellbeing: int,
) -> CheckIn:
    check_in = CheckIn(
        user_id=user_id,
        mood=mood,
        stress=stress,
        energy=energy,
        social_connection=social_connection,
        overall_wellbeing=overall_wellbeing,
    )
    db.add(check_in)
    db.commit()
    db.refresh(check_in)
    return check_in


def list_check_ins_for_user(
    db: Session, user_id: uuid.UUID, since: datetime | None = None
) -> list[CheckIn]:
    stmt = select(CheckIn).where(CheckIn.user_id == user_id)
    if since is not None:
        stmt = stmt.where(CheckIn.created_at >= since)
    stmt = stmt.order_by(CheckIn.created_at.asc())
    return list(db.scalars(stmt))
