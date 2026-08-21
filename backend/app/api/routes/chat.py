import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from openai import APIError
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.repositories import (
    conversation_repository,
    emotion_repository,
    message_repository,
    risk_repository,
    strategy_repository,
)
from app.schemas.chat import ChatEmotionOut, ChatRequest, ChatResponse, ChatRiskOut
from app.services import safety_service, strategy_service
from app.services.emotion_service import classify_emotion
from app.services.llm_service import generate_reply

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])

# Risk level at or above this is treated as a crisis -- the normal LLM reply
# is skipped entirely in favor of the fixed safety-override message.
_CRISIS_RISK_THRESHOLD = 3


@router.post(
    "/conversations/{conversation_id}/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_201_CREATED,
)
def chat(conversation_id: uuid.UUID, payload: ChatRequest, db: Session = Depends(get_db)):
    if not conversation_repository.get_conversation_by_id(db, conversation_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    user_message = message_repository.create_message(
        db, conversation_id=conversation_id, role="user", content=payload.content
    )

    emotion = classify_emotion(payload.content)
    emotion_repository.create_emotion_record(
        db,
        message_id=user_message.id,
        primary_emotion=emotion.primary_emotion,
        confidence=emotion.confidence,
        secondary_emotions=emotion.secondary_emotions,
    )

    risk = safety_service.assess_risk(payload.content)
    risk_repository.create_risk_record(
        db,
        message_id=user_message.id,
        risk_level=risk.risk_level,
        method=risk.method,
        matched_terms=risk.matched_terms,
        rationale=risk.rationale,
    )

    strategies: list[str] = []

    if risk.risk_level >= _CRISIS_RISK_THRESHOLD:
        reply_text = safety_service.SAFETY_OVERRIDE_MESSAGE
    else:
        strategies = strategy_service.select_strategies(
            primary_emotion=emotion.primary_emotion,
            risk_level=risk.risk_level,
            text=payload.content,
        )
        strategy_repository.create_strategy_record(
            db, message_id=user_message.id, strategies=strategies
        )
        guidance = strategy_service.build_guidance_text(strategies)

        history = message_repository.list_messages_for_conversation(
            db, conversation_id, limit=20
        )
        llm_messages = [{"role": m.role, "content": m.content} for m in history]
        try:
            reply_text = generate_reply(llm_messages, strategy_guidance=guidance)
        except (APIError, ValueError):
            logger.exception("LLM call failed for conversation %s", conversation_id)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Sol couldn't generate a response right now. Your message was saved.",
            )

    assistant_message = message_repository.create_message(
        db, conversation_id=conversation_id, role="assistant", content=reply_text
    )

    return ChatResponse(
        reply=assistant_message,
        emotion=ChatEmotionOut(
            primary_emotion=emotion.primary_emotion,
            confidence=emotion.confidence,
            secondary_emotions=emotion.secondary_emotions,
        ),
        risk=ChatRiskOut(
            risk_level=risk.risk_level, method=risk.method, rationale=risk.rationale
        ),
        strategies=strategies,
    )
