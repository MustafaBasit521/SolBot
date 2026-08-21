import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createConversation, listConversations } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Conversation } from "../api/types";
import "./HomePage.css";

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    listConversations()
      .then(setConversations)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleStartChat() {
    setIsCreating(true);
    try {
      const conversation = await createConversation();
      navigate(`/chat/${conversation.id}`);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <div>
          <p className="home-eyebrow">SOL</p>
          <h1 className="home-heading">
            {user?.display_name ? `Hi, ${user.display_name}` : "Welcome back"}
          </h1>
        </div>
        <button className="home-logout" onClick={logout}>
          Sign out
        </button>
      </header>

      <button className="home-start-button" onClick={handleStartChat} disabled={isCreating}>
        <span className="home-start-title">Start text chat</span>
        <span className="home-start-subtitle">Write at your own pace</span>
      </button>

      <section>
        <h2 className="home-section-heading">Recent conversations</h2>
        {isLoading && <p className="home-muted">Loading...</p>}
        {!isLoading && conversations.length === 0 && (
          <p className="home-muted">No conversations yet -- start one above.</p>
        )}
        <ul className="home-list">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                className="home-conversation-item"
                onClick={() => navigate(`/chat/${c.id}`)}
              >
                <span>{c.title ?? "Untitled conversation"}</span>
                <span className="home-muted">
                  {new Date(c.updated_at).toLocaleDateString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
