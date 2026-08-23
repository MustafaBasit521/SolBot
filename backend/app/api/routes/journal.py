from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_owned_journal_entry
from app.database.connection import get_db
from app.database.repositories import journal_repository
from app.models.journal_entry import JournalEntry
from app.models.user import User
from app.schemas.journal import JournalEntryCreate, JournalEntryOut, JournalEntryUpdate

router = APIRouter(prefix="/journal", tags=["journal"])


@router.post("", response_model=JournalEntryOut, status_code=status.HTTP_201_CREATED)
def create_entry(
    payload: JournalEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return journal_repository.create_entry(
        db, user_id=current_user.id, title=payload.title, content=payload.content
    )


@router.get("", response_model=list[JournalEntryOut])
def list_entries(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return journal_repository.list_entries_for_user(db, current_user.id)


@router.get("/{entry_id}", response_model=JournalEntryOut)
def get_entry(entry: JournalEntry = Depends(get_owned_journal_entry)):
    return entry


@router.patch("/{entry_id}", response_model=JournalEntryOut)
def update_entry(
    payload: JournalEntryUpdate,
    entry: JournalEntry = Depends(get_owned_journal_entry),
    db: Session = Depends(get_db),
):
    return journal_repository.update_entry(
        db, entry, title=payload.title, content=payload.content
    )


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry: JournalEntry = Depends(get_owned_journal_entry), db: Session = Depends(get_db)
):
    journal_repository.delete_entry(db, entry)
