import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, listMessages, sendChatMessage } from "../api/client";
import type { Message } from "../api/types";

const CRISIS_RISK_THRESHOLD = 3;

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSignals, setLastSignals] = useState<string | null>(null);
  // Only messages received during this session can be flagged here -- the
  // history endpoint doesn't yet return risk data for older messages, so a
  // safety reply from a previous session renders as a normal bubble on
  // reload. Noted as a known gap, not silently pretended away.
  const [safetyMessageIds, setSafetyMessageIds] = useState<Set<string>>(new Set());
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
      if (result.risk.risk_level >= CRISIS_RISK_THRESHOLD) {
        setSafetyMessageIds((prev) => new Set(prev).add(result.reply.id));
      }
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
        {messages.map((m) =>
          safetyMessageIds.has(m.id) ? (
            <div key={m.id} style={styles.safetyCard}>
              <p style={styles.safetyEyebrow}>Support mode</p>
              <h2 style={styles.safetyHeading}>Let's pause for a moment</h2>
              <p style={styles.safetyBody}>{m.content}</p>
            </div>
          ) : (
            <div
              key={m.id}
              style={{
                ...styles.bubble,
                ...(m.role === "user" ? styles.userBubble : styles.assistantBubble),
              }}
            >
              {m.content}
            </div>
          ),
        )}
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
    maxWidth: "min(100%, 640px)",
    margin: "0 auto",
    padding: "16px clamp(12px, 4vw, 20px) 24px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "var(--paper-raised)",
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
    color: "var(--ink-meta)",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  heading: {
    fontSize: "1.2rem",
    color: "var(--ink-primary)",
    margin: 0,
  },
  subtitle: {
    fontSize: "0.75rem",
    color: "var(--ink-meta)",
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
    background: "var(--green-base)",
    color: "var(--paper-raised)",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    background: "#ffffff",
    color: "var(--ink-primary)",
    border: "1px solid var(--ink-hairline)",
  },
  safetyCard: {
    alignSelf: "stretch",
    background: "var(--night-support)",
    borderRadius: "var(--radius-lg)",
    padding: "20px",
    borderLeft: "4px solid var(--ember-action)",
  },
  safetyEyebrow: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--ember-heading)",
    margin: 0,
  },
  safetyHeading: {
    fontFamily: "var(--font-heading)",
    fontSize: "1.3rem",
    color: "var(--night-text)",
    margin: "8px 0 10px",
  },
  safetyBody: {
    color: "#a9b8b4",
    fontSize: "0.95rem",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    margin: 0,
  },
  signals: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--ink-quiet)",
    margin: "8px 0 0",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  error: {
    color: "var(--clay-text)",
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
    border: "1px solid var(--ink-hairline)",
    background: "var(--paper-app)",
    color: "var(--ink-primary)",
    fontSize: "0.95rem",
    minWidth: 0,
  },
  sendButton: {
    padding: "12px 20px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "var(--green-base)",
    color: "var(--paper-raised)",
    cursor: "pointer",
    flexShrink: 0,
  },
  muted: {
    color: "var(--ink-meta)",
    fontSize: "0.85rem",
  },
};
