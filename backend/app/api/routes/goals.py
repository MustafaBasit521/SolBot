from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_owned_goal
from app.database.connection import get_db
from app.database.repositories import goal_repository
from app.models.goal import Goal
from app.models.user import User
from app.schemas.goal import GoalCreate, GoalOut, GoalToggleOut

router = APIRouter(prefix="/goals", tags=["goals"])


def _to_out(db: Session, goal: Goal) -> GoalOut:
    return GoalOut(
        id=goal.id,
        title=goal.title,
        is_active=goal.is_active,
        created_at=goal.created_at,
        completed_dates=goal_repository.recent_completed_dates(db, goal.id),
    )


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = goal_repository.create_goal(db, user_id=current_user.id, title=payload.title)
    return _to_out(db, goal)


@router.get("", response_model=list[GoalOut])
def list_goals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goals = goal_repository.list_goals_for_user(db, current_user.id)
    return [_to_out(db, g) for g in goals]


@router.post("/{goal_id}/toggle", response_model=GoalToggleOut)
def toggle_goal(goal: Goal = Depends(get_owned_goal), db: Session = Depends(get_db)):
    done_today = goal_repository.toggle_today(db, goal.id)
    return GoalToggleOut(done_today=done_today)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal: Goal = Depends(get_owned_goal), db: Session = Depends(get_db)):
    goal_repository.delete_goal(db, goal)
