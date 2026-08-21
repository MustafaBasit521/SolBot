import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CheckInCreate(BaseModel):
    mood: int = Field(ge=0, le=100)
    stress: int = Field(ge=0, le=100)
    energy: int = Field(ge=0, le=100)
    social_connection: int = Field(ge=0, le=100)
    overall_wellbeing: int = Field(ge=0, le=100)


class CheckInOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    mood: int
    stress: int
    energy: int
    social_connection: int
    overall_wellbeing: int
    created_at: datetime
