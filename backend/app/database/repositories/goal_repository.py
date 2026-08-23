import uuid
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.goal import Goal, GoalCompletion


def create_goal(db: Session, *, user_id: uuid.UUID, title: str) -> Goal:
    goal = Goal(user_id=user_id, title=title)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def list_goals_for_user(db: Session, user_id: uuid.UUID) -> list[Goal]:
    stmt = (
        select(Goal)
        .where(Goal.user_id == user_id, Goal.is_active.is_(True))
        .order_by(Goal.created_at.asc())
    )
    return list(db.scalars(stmt))


def get_goal(db: Session, goal_id: uuid.UUID) -> Goal | None:
    return db.get(Goal, goal_id)


def delete_goal(db: Session, goal: Goal) -> None:
    db.delete(goal)
    db.commit()


def recent_completed_dates(
    db: Session, goal_id: uuid.UUID, days: int = 14
) -> list[date]:
    since = date.today() - timedelta(days=days - 1)
    stmt = (
        select(GoalCompletion.completed_date)
        .where(GoalCompletion.goal_id == goal_id, GoalCompletion.completed_date >= since)
        .order_by(GoalCompletion.completed_date.asc())
    )
    return list(db.scalars(stmt))


def toggle_today(db: Session, goal_id: uuid.UUID) -> bool:
    """Toggles today's completion for a goal. Returns the new state (True =
    now marked done, False = now unmarked)."""
    today = date.today()
    stmt = select(GoalCompletion).where(
        GoalCompletion.goal_id == goal_id, GoalCompletion.completed_date == today
    )
    existing = db.scalars(stmt).first()

    if existing:
        db.delete(existing)
        db.commit()
        return False

    db.add(GoalCompletion(goal_id=goal_id, completed_date=today))
    db.commit()
    return True
