import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JournalEntryCreate(BaseModel):
    title: str | None = None
    content: str = Field(min_length=1)


class JournalEntryUpdate(BaseModel):
    title: str | None = None
    content: str = Field(min_length=1)


class JournalEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str | None
    content: str
    created_at: datetime
    updated_at: datetime
