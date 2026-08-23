import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GroundingSessionCreate(BaseModel):
    pre_intensity: int = Field(ge=0, le=10)


class GroundingSessionUpdate(BaseModel):
    post_intensity: int | None = Field(default=None, ge=0, le=10)
    completed: bool = True


class GroundingSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pre_intensity: int
    post_intensity: int | None
    completed: bool
    created_at: datetime
