import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class GroundingSession(Base):
    """A logged instance of the crisis-moment breathing/grounding overlay --
    shown automatically when a chat message crosses the crisis risk
    threshold. Self-reported intensity only; never a claim to measure the
    user's actual physiology."""

    __tablename__ = "grounding_sessions"
    __table_args__ = (
        CheckConstraint("pre_intensity BETWEEN 0 AND 10", name="ck_grounding_pre_range"),
        CheckConstraint(
            "post_intensity IS NULL OR post_intensity BETWEEN 0 AND 10",
            name="ck_grounding_post_range",
        ),
        Index("ix_grounding_sessions_user_id_created_at", "user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    pre_intensity: Mapped[int] = mapped_column(Integer, nullable=False)
    post_intensity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
