import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base

_RANGE = "BETWEEN 0 AND 100"


class CheckIn(Base):
    __tablename__ = "check_ins"
    __table_args__ = (
        CheckConstraint(f"mood {_RANGE}", name="ck_check_ins_mood_range"),
        CheckConstraint(f"stress {_RANGE}", name="ck_check_ins_stress_range"),
        CheckConstraint(f"energy {_RANGE}", name="ck_check_ins_energy_range"),
        CheckConstraint(f"social_connection {_RANGE}", name="ck_check_ins_social_range"),
        CheckConstraint(f"overall_wellbeing {_RANGE}", name="ck_check_ins_overall_range"),
        Index("ix_check_ins_user_id_created_at", "user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # 0-100 sliders -- the frontend maps these to the design's worded
    # endpoints (e.g. mood: "Low" .. "Bright"), not raw numbers shown to
    # the user.
    mood: Mapped[int] = mapped_column(Integer, nullable=False)
    stress: Mapped[int] = mapped_column(Integer, nullable=False)
    energy: Mapped[int] = mapped_column(Integer, nullable=False)
    social_connection: Mapped[int] = mapped_column(Integer, nullable=False)
    overall_wellbeing: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
