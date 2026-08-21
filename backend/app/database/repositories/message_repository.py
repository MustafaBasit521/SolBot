import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.message import Message


def create_message(
    db: Session, *, conversation_id: uuid.UUID, role: str, content: str
) -> Message:
    message = Message(conversation_id=conversation_id, role=role, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def list_messages_for_conversation(
    db: Session, conversation_id: uuid.UUID, limit: int = 20
) -> list[Message]:
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    # Fetch the most recent `limit` rows, then reverse to chronological
    # order -- this is the bounded-context-window read the LLM service
    # will use, rather than ever pulling the full conversation history.
    messages = list(db.scalars(stmt))
    messages.reverse()
    return messages


def list_all_messages_for_conversation(db: Session, conversation_id: uuid.UUID) -> list[Message]:
    """Unbounded, chronological -- for data export, not for LLM context."""
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    return list(db.scalars(stmt))
