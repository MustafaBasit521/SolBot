import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.emotion import EmotionRecord
from app.models.message import Message


def create_emotion_record(
    db: Session,
    *,
    message_id: uuid.UUID,
    primary_emotion: str,
    confidence: float,
    secondary_emotions: list[dict],
) -> EmotionRecord:
    record = EmotionRecord(
        message_id=message_id,
        primary_emotion=primary_emotion,
        confidence=confidence,
        secondary_emotions=secondary_emotions,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def top_emotional_themes_for_user(
    db: Session, user_id: uuid.UUID, since: datetime | None, limit: int = 6
) -> list[tuple[str, int]]:
    stmt = (
        select(EmotionRecord.primary_emotion, func.count().label("count"))
        .join(Message, Message.id == EmotionRecord.message_id)
        .join(Conversation, Conversation.id == Message.conversation_id)
        .where(Conversation.user_id == user_id)
    )
    if since is not None:
        stmt = stmt.where(EmotionRecord.created_at >= since)
    stmt = (
        stmt.group_by(EmotionRecord.primary_emotion)
        .order_by(func.count().desc())
        .limit(limit)
    )
    return list(db.execute(stmt).all())
