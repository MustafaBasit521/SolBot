from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.database.repositories import check_in_repository
from app.models.user import User
from app.schemas.check_in import CheckInCreate, CheckInOut

router = APIRouter(prefix="/check-ins", tags=["check-ins"])


@router.post("", response_model=CheckInOut, status_code=status.HTTP_201_CREATED)
def create_check_in(
    payload: CheckInCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return check_in_repository.create_check_in(
        db,
        user_id=current_user.id,
        mood=payload.mood,
        stress=payload.stress,
        energy=payload.energy,
        social_connection=payload.social_connection,
        overall_wellbeing=payload.overall_wellbeing,
    )


@router.get("", response_model=list[CheckInOut])
def list_check_ins(
    days: int | None = Query(default=None, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days) if days else None
    return check_in_repository.list_check_ins_for_user(db, current_user.id, since=since)
