import uuid

from sqlalchemy.orm import Session

from app.models.strategy import StrategyRecord


def create_strategy_record(
    db: Session, *, message_id: uuid.UUID, strategies: list[str]
) -> StrategyRecord:
    record = StrategyRecord(message_id=message_id, strategies=strategies)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
