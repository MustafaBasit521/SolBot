from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import hash_password
from app.database.connection import get_db
from app.database.repositories import user_repository
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
