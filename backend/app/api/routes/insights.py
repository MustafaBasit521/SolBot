from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.database.repositories import check_in_repository, emotion_repository
from app.models.user import User
from app.schemas.insights import EmotionalTheme, MoodTrendPoint

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/mood-trend", response_model=list[MoodTrendPoint])
def mood_trend(
    days: int = Query(default=14, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    check_ins = check_in_repository.list_check_ins_for_user(db, current_user.id, since=since)
    return [
        MoodTrendPoint(created_at=c.created_at, mood=c.mood, stress=c.stress)
        for c in check_ins
    ]


@router.get("/emotional-themes", response_model=list[EmotionalTheme])
def emotional_themes(
    days: int = Query(default=14, ge=1, le=365),
    limit: int = Query(default=6, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = emotion_repository.top_emotional_themes_for_user(
        db, current_user.id, since=since, limit=limit
    )
    return [EmotionalTheme(label=label, count=count) for label, count in rows]
