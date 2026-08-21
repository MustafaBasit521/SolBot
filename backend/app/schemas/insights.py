from datetime import datetime

from pydantic import BaseModel


class MoodTrendPoint(BaseModel):
    created_at: datetime
    mood: int
    stress: int


class EmotionalTheme(BaseModel):
    label: str
    count: int
