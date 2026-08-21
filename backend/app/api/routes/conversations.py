import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.repositories import conversation_repository, user_repository
from app.schemas.conversation import ConversationCreate, ConversationOut

router = APIRouter(tags=["conversations"])


@router.post(
    "/users/{user_id}/conversations",
    response_model=ConversationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    user_id: uuid.UUID, payload: ConversationCreate, db: Session = Depends(get_db)
):
    if not user_repository.get_user_by_id(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return conversation_repository.create_conversation(db, user_id=user_id, title=payload.title)


@router.get("/users/{user_id}/conversations", response_model=list[ConversationOut])
def list_conversations(user_id: uuid.UUID, db: Session = Depends(get_db)):
    if not user_repository.get_user_by_id(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return conversation_repository.list_conversations_for_user(db, user_id)


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: uuid.UUID, db: Session = Depends(get_db)):
    conversation = conversation_repository.get_conversation_by_id(db, conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    return conversation


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: uuid.UUID, db: Session = Depends(get_db)):
    conversation = conversation_repository.get_conversation_by_id(db, conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    conversation_repository.delete_conversation(db, conversation)
