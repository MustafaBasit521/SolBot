import uuid

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
