import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from openai import APIError
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.repositories import conversation_repository, message_repository
from app.schemas.chat import ChatRequest
from app.schemas.message import MessageOut
from app.services.llm_service import generate_reply

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


@router.post(
    "/conversations/{conversation_id}/chat",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
def chat(conversation_id: uuid.UUID, payload: ChatRequest, db: Session = Depends(get_db)):
    if not conversation_repository.get_conversation_by_id(db, conversation_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    message_repository.create_message(
        db, conversation_id=conversation_id, role="user", content=payload.content
    )

    history = message_repository.list_messages_for_conversation(db, conversation_id, limit=20)
    llm_messages = [{"role": m.role, "content": m.content} for m in history]

    try:
        reply_text = generate_reply(llm_messages)
    except (APIError, ValueError):
        logger.exception("LLM call failed for conversation %s", conversation_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Sol couldn't generate a response right now. Your message was saved.",
        )

    return message_repository.create_message(
        db, conversation_id=conversation_id, role="assistant", content=reply_text
    )
