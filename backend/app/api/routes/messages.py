import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.repositories import conversation_repository, message_repository
from app.schemas.message import MessageCreate, MessageOut

router = APIRouter(tags=["messages"])


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
def create_message(
    conversation_id: uuid.UUID, payload: MessageCreate, db: Session = Depends(get_db)
):
    if not conversation_repository.get_conversation_by_id(db, conversation_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    return message_repository.create_message(
        db, conversation_id=conversation_id, role=payload.role, content=payload.content
    )


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(
    conversation_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    if not conversation_repository.get_conversation_by_id(db, conversation_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    return message_repository.list_messages_for_conversation(db, conversation_id, limit=limit)
