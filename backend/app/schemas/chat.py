from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    content: str = Field(min_length=1)
