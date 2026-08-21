import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.risk import RiskRecord


def create_risk_record(
    db: Session,
    *,
    message_id: uuid.UUID,
    risk_level: int,
    method: str,
    matched_terms: list[str] | None,
    rationale: str | None,
) -> RiskRecord:
    record = RiskRecord(
        message_id=message_id,
        risk_level=risk_level,
        method=method,
        matched_terms=matched_terms,
        rationale=rationale,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_risk_levels_for_messages(
    db: Session, message_ids: list[uuid.UUID]
) -> dict[uuid.UUID, int]:
    if not message_ids:
        return {}
    stmt = select(RiskRecord.message_id, RiskRecord.risk_level).where(
        RiskRecord.message_id.in_(message_ids)
    )
    return dict(db.execute(stmt).all())
