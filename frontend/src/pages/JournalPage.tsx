import { useEffect, useState } from "react";
import {
  createJournalEntry,
  deleteJournalEntry,
  listJournalEntries,
  updateJournalEntry,
} from "../api/client";
import type { JournalEntry } from "../api/types";
import { BackArrow } from "../components/BackArrow";
import { BottomNav } from "../components/BottomNav";
import { ChatFAB } from "../components/ChatFAB";
import "./JournalPage.css";

export function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // Mobile shows list XOR editor as two screens; desktop shows both via CSS.
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setIsLoading(true);
    listJournalEntries()
      .then(setEntries)
      .finally(() => setIsLoading(false));
  }

  function openEntry(entry: JournalEntry) {
    setSelectedId(entry.id);
    setIsNew(false);
    setTitle(entry.title ?? "");
    setContent(entry.content);
    setMobileView("editor");
  }

  function startNewEntry() {
    setSelectedId(null);
    setIsNew(true);
    setTitle("");
    setContent("");
    setMobileView("editor");
  }

  async function handleSave() {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      const payload = { title: title.trim() || null, content };
      if (isNew) {
        const created = await createJournalEntry(payload);
        setIsNew(false);
        setSelectedId(created.id);
      } else if (selectedId) {
        await updateJournalEntry(selectedId, payload);
      }
      refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    await deleteJournalEntry(selectedId);
    setSelectedId(null);
    setIsNew(false);
    setTitle("");
    setContent("");
    setMobileView("list");
    refresh();
  }

  const showEditor = isNew || selectedId !== null;

  return (
    <div className="journal-page">
      <header className="journal-header">
        <p className="journal-eyebrow">Journal</p>
        <h1 className="journal-heading">A private space to write</h1>
        <p className="journal-subtitle">
          Just for you -- not part of the conversation with Sol, and not analysed.
        </p>
      </header>

      <div className="journal-body">
        <div
          className={`journal-list-col ${mobileView === "editor" ? "journal-hidden-mobile" : ""}`}
        >
          <button className="journal-new-button" onClick={startNewEntry}>
            New entry
          </button>
          {isLoading && <p className="journal-empty">Loading...</p>}
          {!isLoading && entries.length === 0 && (
            <p className="journal-empty">No entries yet -- start writing above.</p>
          )}
          <ul className="journal-list">
            {entries.map((e) => (
              <li key={e.id}>
                <button
                  className={`journal-list-item ${e.id === selectedId ? "active" : ""}`}
                  onClick={() => openEntry(e)}
                >
                  <p className="journal-list-item-title">{e.title || "Untitled entry"}</p>
                  <p className="journal-list-item-preview">{e.content}</p>
                  <span className="journal-list-item-date">
                    {new Date(e.updated_at).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`journal-editor-col ${mobileView === "list" ? "journal-hidden-mobile" : ""}`}
        >
          {showEditor ? (
            <div className="journal-editor">
              <button className="journal-back-button" onClick={() => setMobileView("list")}>
                <BackArrow /> Back to entries
              </button>
              <input
                className="journal-title-input"
                type="text"
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="journal-content-textarea"
                placeholder="Write whatever's on your mind..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="journal-editor-actions">
                <button
                  className="journal-save-button"
                  onClick={handleSave}
                  disabled={isSaving || !content.trim()}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                {!isNew && (
                  <button className="journal-delete-button" onClick={handleDelete}>
                    Delete entry
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="journal-editor-placeholder">
              Select an entry, or start a new one, to begin writing.
            </p>
          )}
        </div>
      </div>

      <BottomNav />
      <ChatFAB />
    </div>
  );
}
