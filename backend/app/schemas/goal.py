import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    is_active: bool
    created_at: datetime
    completed_dates: list[date] = []


class GoalToggleOut(BaseModel):
    done_today: bool
