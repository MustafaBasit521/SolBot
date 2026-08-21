from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_owned_conversation
from app.database.connection import get_db
from app.database.repositories import message_repository, risk_repository
from app.models.conversation import Conversation
from app.schemas.message import MessageCreate, MessageOut

router = APIRouter(tags=["messages"])


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
def create_message(
    payload: MessageCreate,
    conversation: Conversation = Depends(get_owned_conversation),
    db: Session = Depends(get_db),
):
    return message_repository.create_message(
        db, conversation_id=conversation.id, role=payload.role, content=payload.content
    )


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(
    conversation: Conversation = Depends(get_owned_conversation),
    limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    messages = message_repository.list_messages_for_conversation(db, conversation.id, limit=limit)
    risk_levels = risk_repository.get_risk_levels_for_messages(db, [m.id for m in messages])
    return [
        MessageOut.model_validate(m).model_copy(update={"risk_level": risk_levels.get(m.id)})
        for m in messages
    ]
