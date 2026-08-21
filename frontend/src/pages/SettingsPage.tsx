import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteAccount,
  deleteConversation,
  exportMyData,
  listConversations,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Conversation } from "../api/types";
import { BottomNav } from "../components/BottomNav";
import "./SettingsPage.css";

export function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    refreshConversations();
  }, []);

  function refreshConversations() {
    setIsLoading(true);
    listConversations()
      .then(setConversations)
      .finally(() => setIsLoading(false));
  }

  async function handleDownloadData() {
    const data = await exportMyData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sol-data-export.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Your data export has downloaded.");
  }

  async function handleDeleteConversation(id: string) {
    if (!window.confirm("Delete this conversation? This can't be undone.")) return;
    await deleteConversation(id);
    refreshConversations();
    setStatus("Conversation deleted.");
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "Delete your account and all your data? This can't be undone, and you'll be signed out immediately.",
      )
    ) {
      return;
    }
    await deleteAccount();
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="settings-page">
      <h1 className="settings-heading">Settings</h1>

      {status && <p className="settings-status">{status}</p>}

      <p className="settings-section-label">Privacy &amp; data</p>
      <div className="settings-group">
        <div className="settings-row">
          <span className="settings-row-label">Privacy note</span>
          <span className="settings-row-action">
            Your conversations are used to run Sol's emotion, risk, and support features. They
            are not sold or shared with third parties.
          </span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Download my data</span>
          <button className="settings-row-action" onClick={handleDownloadData}>
            Export
          </button>
        </div>
      </div>

      <p className="settings-section-label">Erase</p>
      <div className="settings-group">
        {isLoading && <p className="settings-empty">Loading conversations...</p>}
        {!isLoading && conversations.length === 0 && (
          <p className="settings-empty">No conversations to delete yet.</p>
        )}
        {!isLoading && conversations.length > 0 && (
          <ul className="settings-conversation-list">
            {conversations.map((c) => (
              <li className="settings-conversation-row" key={c.id}>
                <span>{c.title ?? "Untitled conversation"}</span>
                <button
                  className="settings-row-action destructive"
                  onClick={() => handleDeleteConversation(c.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="settings-group">
        <div className="settings-row">
          <span className="settings-row-label">Delete account and all my data</span>
          <button className="settings-row-action destructive" onClick={handleDeleteAccount}>
            Delete
          </button>
        </div>
        <p className="settings-danger-note">
          Removes your conversations, check-ins, and account permanently.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
