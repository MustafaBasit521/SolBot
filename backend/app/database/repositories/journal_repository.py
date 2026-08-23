import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.journal_entry import JournalEntry


def create_entry(
    db: Session, *, user_id: uuid.UUID, title: str | None, content: str
) -> JournalEntry:
    entry = JournalEntry(user_id=user_id, title=title, content=content)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def list_entries_for_user(db: Session, user_id: uuid.UUID) -> list[JournalEntry]:
    stmt = (
        select(JournalEntry)
        .where(JournalEntry.user_id == user_id)
        .order_by(JournalEntry.created_at.desc())
    )
    return list(db.scalars(stmt))


def get_entry(db: Session, entry_id: uuid.UUID) -> JournalEntry | None:
    return db.get(JournalEntry, entry_id)


def update_entry(
    db: Session, entry: JournalEntry, *, title: str | None, content: str
) -> JournalEntry:
    entry.title = title
    entry.content = content
    db.commit()
    db.refresh(entry)
    return entry


def delete_entry(db: Session, entry: JournalEntry) -> None:
    db.delete(entry)
    db.commit()
