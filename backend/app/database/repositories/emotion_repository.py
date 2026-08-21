import uuid

from sqlalchemy.orm import Session

from app.models.emotion import EmotionRecord


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
