import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, listMessages, sendChatMessage } from "../api/client";
import type { Message } from "../api/types";

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSignals, setLastSignals] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;
    listMessages(conversationId)
      .then(setMessages)
      .catch(() => setError("Couldn't load this conversation."))
      .finally(() => setIsLoading(false));
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !conversationId) return;

    const content = draft.trim();
    setDraft("");
    setError(null);
    setIsSending(true);

    const optimisticUserMessage: Message = {
      id: `pending-${Date.now()}`,
      conversation_id: conversationId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);

    try {
      const result = await sendChatMessage(conversationId, content);
      setMessages((prev) => [...prev, result.reply]);
      setLastSignals(
        `${result.emotion.primary_emotion} · risk level ${result.risk.risk_level}${
          result.strategies.length ? ` · ${result.strategies.join(", ")}` : ""
        }`,
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMessage.id));
      setDraft(content);
      setError(err instanceof ApiError ? err.message : "Sol couldn't reply right now.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate("/")}>
          &larr; Home
        </button>
        <div>
          <h1 style={styles.heading}>Sol</h1>
          <p style={styles.subtitle}>Supportive conversation · not clinical care</p>
        </div>
      </header>

      <div style={styles.thread}>
        {isLoading && messages.length === 0 && (
          <p style={styles.muted}>Loading conversation...</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              ...styles.bubble,
              ...(m.role === "user" ? styles.userBubble : styles.assistantBubble),
            }}
          >
            {m.content}
          </div>
        ))}
        {isSending && <p style={styles.muted}>Sol is thinking...</p>}
        <div ref={bottomRef} />
      </div>

      {lastSignals && <p style={styles.signals}>{lastSignals}</p>}
      {error && <p style={styles.error}>{error}</p>}

      <form onSubmit={handleSend} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="Write what's on your mind"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isSending}
        />
        <button style={styles.sendButton} type="submit" disabled={isSending || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 560,
    margin: "0 auto",
    padding: "16px 16px 24px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "12px",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  heading: {
    fontSize: "1.2rem",
    margin: 0,
  },
  subtitle: {
    fontSize: "0.75rem",
    color: "var(--color-text-muted)",
    margin: 0,
  },
  thread: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "8px 0",
  },
  bubble: {
    maxWidth: "80%",
    padding: "12px 16px",
    borderRadius: "var(--radius-md)",
    fontSize: "0.95rem",
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
  },
  userBubble: {
    alignSelf: "flex-end",
    background: "var(--color-primary)",
    color: "var(--color-primary-contrast)",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
  },
  signals: {
    fontSize: "0.7rem",
    color: "var(--color-text-muted)",
    margin: "8px 0 0",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  error: {
    color: "#b3432b",
    fontSize: "0.85rem",
  },
  form: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },
  input: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    fontSize: "0.95rem",
    fontFamily: "inherit",
  },
  sendButton: {
    padding: "12px 20px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "var(--color-primary)",
    color: "var(--color-primary-contrast)",
    cursor: "pointer",
  },
  muted: {
    color: "var(--color-text-muted)",
    fontSize: "0.85rem",
  },
};
