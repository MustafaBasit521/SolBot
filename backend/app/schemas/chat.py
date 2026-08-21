from pydantic import BaseModel, Field

from app.schemas.message import MessageOut


class ChatRequest(BaseModel):
    content: str = Field(min_length=1)


class ChatEmotionOut(BaseModel):
    primary_emotion: str
    confidence: float
    secondary_emotions: list[dict]


class ChatRiskOut(BaseModel):
    risk_level: int
    method: str
    rationale: str | None


class ChatResponse(BaseModel):
    reply: MessageOut
    emotion: ChatEmotionOut
    risk: ChatRiskOut
