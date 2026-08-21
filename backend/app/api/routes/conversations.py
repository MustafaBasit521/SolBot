from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_owned_conversation
from app.database.connection import get_db
from app.database.repositories import conversation_repository
from app.models.conversation import Conversation
from app.models.user import User
from app.schemas.conversation import ConversationCreate, ConversationOut

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return conversation_repository.create_conversation(
        db, user_id=current_user.id, title=payload.title
    )


@router.get("", response_model=list[ConversationOut])
def list_conversations(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return conversation_repository.list_conversations_for_user(db, current_user.id)


@router.get("/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation: Conversation = Depends(get_owned_conversation)):
    return conversation


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation: Conversation = Depends(get_owned_conversation),
    db: Session = Depends(get_db),
):
    conversation_repository.delete_conversation(db, conversation)
