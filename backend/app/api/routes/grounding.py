from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_owned_grounding_session
from app.database.connection import get_db
from app.database.repositories import grounding_repository
from app.models.grounding_session import GroundingSession
from app.models.user import User
from app.schemas.grounding import (
    GroundingSessionCreate,
    GroundingSessionOut,
    GroundingSessionUpdate,
)

router = APIRouter(prefix="/grounding-sessions", tags=["grounding"])


@router.post("", response_model=GroundingSessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: GroundingSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return grounding_repository.create_session(
        db, user_id=current_user.id, pre_intensity=payload.pre_intensity
    )


@router.patch("/{session_id}", response_model=GroundingSessionOut)
def complete_session(
    payload: GroundingSessionUpdate,
    session: GroundingSession = Depends(get_owned_grounding_session),
    db: Session = Depends(get_db),
):
    return grounding_repository.complete_session(
        db, session, post_intensity=payload.post_intensity, completed=payload.completed
    )
