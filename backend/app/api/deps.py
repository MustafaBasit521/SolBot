import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.connection import get_db
from app.database.repositories import conversation_repository, user_repository
from app.models.conversation import Conversation
from app.models.user import User

_bearer_scheme = HTTPBearer()

_credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        user_id = decode_access_token(credentials.credentials)
        user = user_repository.get_user_by_id(db, uuid.UUID(user_id))
    except (jwt.PyJWTError, ValueError):
        raise _credentials_exception

    if not user:
        raise _credentials_exception

    return user


def get_owned_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Conversation:
    """Fetches a conversation and verifies it belongs to the authenticated
    user. 404 (not 403) on mismatch, so a guessed ID doesn't reveal whether
    it belongs to someone else."""
    conversation = conversation_repository.get_conversation_by_id(db, conversation_id)
    if not conversation or conversation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )
    return conversation
