import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createConversation, listConversations } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Conversation } from "../api/types";

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
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>SOL</p>
          <h1 style={styles.heading}>
            {user?.display_name ? `Hi, ${user.display_name}` : "Welcome back"}
          </h1>
        </div>
        <button style={styles.logoutButton} onClick={logout}>
          Sign out
        </button>
      </header>

      <button style={styles.startButton} onClick={handleStartChat} disabled={isCreating}>
        <span style={styles.startButtonTitle}>Start text chat</span>
        <span style={styles.startButtonSubtitle}>Write at your own pace</span>
      </button>

      <section>
        <h2 style={styles.sectionHeading}>Recent conversations</h2>
        {isLoading && <p style={styles.muted}>Loading...</p>}
        {!isLoading && conversations.length === 0 && (
          <p style={styles.muted}>No conversations yet -- start one above.</p>
        )}
        <ul style={styles.list}>
          {conversations.map((c) => (
            <li key={c.id}>
              <button style={styles.conversationItem} onClick={() => navigate(`/chat/${c.id}`)}>
                <span>{c.title ?? "Untitled conversation"}</span>
                <span style={styles.muted}>
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: "min(100%, 600px)",
    margin: "0 auto",
    padding: "24px clamp(16px, 4vw, 28px) 80px",
    background: "var(--paper-app)",
    minHeight: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "8px",
  },
  eyebrow: {
    fontSize: "0.75rem",
    letterSpacing: "0.08em",
    color: "var(--ink-meta)",
    margin: 0,
  },
  heading: {
    fontSize: "1.6rem",
    color: "var(--ink-primary)",
    margin: "4px 0 0",
  },
  logoutButton: {
    background: "none",
    border: "none",
    color: "var(--ink-meta)",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  startButton: {
    width: "100%",
    textAlign: "left",
    background: "var(--green-base)",
    color: "var(--paper-raised)",
    border: "none",
    borderRadius: "var(--radius-lg)",
    padding: "20px",
    marginBottom: "28px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  startButtonTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
  },
  startButtonSubtitle: {
    fontSize: "0.85rem",
    opacity: 0.85,
  },
  sectionHeading: {
    fontSize: "0.95rem",
    color: "var(--ink-secondary)",
    fontFamily: "var(--font-body)",
    marginBottom: "12px",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  conversationItem: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    background: "var(--paper-raised)",
    border: `1px solid var(--ink-hairline)`,
    borderRadius: "var(--radius-md)",
    padding: "14px 16px",
    cursor: "pointer",
    fontSize: "0.95rem",
    color: "var(--ink-primary)",
    textAlign: "left",
  },
  muted: {
    color: "var(--ink-meta)",
    fontSize: "0.85rem",
  },
};
