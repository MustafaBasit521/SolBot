from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import hash_password
from app.database.connection import get_db
from app.database.repositories import (
    check_in_repository,
    conversation_repository,
    message_repository,
    user_repository,
)
from app.models.user import User
from app.schemas.user import UserCreate, UserOut
from app.services.email_service import send_welcome_email

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    if user_repository.get_user_by_email(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )
    user = user_repository.create_user(
        db,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name,
    )
    # Runs after the response is sent -- signup succeeds/fails independently
    # of whether the welcome email goes through.
    background_tasks.add_task(send_welcome_email, user.email, user.display_name)
    return user


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_repository.delete_user(db, current_user)


@router.get("/me/export")
def export_my_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conversations = conversation_repository.list_conversations_for_user(db, current_user.id)
    check_ins = check_in_repository.list_check_ins_for_user(db, current_user.id)

    return {
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "display_name": current_user.display_name,
            "created_at": current_user.created_at.isoformat(),
        },
        "conversations": [
            {
                "id": str(c.id),
                "title": c.title,
                "created_at": c.created_at.isoformat(),
                "messages": [
                    {
                        "role": m.role,
                        "content": m.content,
                        "created_at": m.created_at.isoformat(),
                    }
                    for m in message_repository.list_all_messages_for_conversation(db, c.id)
                ],
            }
            for c in conversations
        ],
        "check_ins": [
            {
                "mood": ci.mood,
                "stress": ci.stress,
                "energy": ci.energy,
                "social_connection": ci.social_connection,
                "overall_wellbeing": ci.overall_wellbeing,
                "created_at": ci.created_at.isoformat(),
            }
            for ci in check_ins
        ],
    }
