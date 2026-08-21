import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, listMessages, sendChatMessage } from "../api/client";
import type { Message } from "../api/types";
import "./ChatPage.css";

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
    <div className="chat-page">
      <header className="chat-header">
        <button className="chat-back" onClick={() => navigate("/")}>
          &larr; Home
        </button>
        <div>
          <h1 className="chat-heading">Sol</h1>
          <p className="chat-subtitle">Supportive conversation · not clinical care</p>
        </div>
      </header>

      <div className="chat-thread">
        {isLoading && messages.length === 0 && (
          <p className="chat-muted">Loading conversation...</p>
        )}
        {messages.map((m) =>
          safetyMessageIds.has(m.id) ? (
            <div key={m.id} className="chat-safety-card">
              <p className="chat-safety-eyebrow">Support mode</p>
              <h2 className="chat-safety-heading">Let's pause for a moment</h2>
              <p className="chat-safety-body">{m.content}</p>
            </div>
          ) : (
            <div
              key={m.id}
              className={`chat-bubble ${
                m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"
              }`}
            >
              {m.content}
            </div>
          ),
        )}
        {isSending && <p className="chat-muted">Sol is thinking...</p>}
        <div ref={bottomRef} />
      </div>

      {lastSignals && <p className="chat-signals">{lastSignals}</p>}
      {error && <p className="chat-error">{error}</p>}

      <form onSubmit={handleSend} className="chat-form">
        <input
          className="chat-input"
          type="text"
          placeholder="Write what's on your mind"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isSending}
        />
        <button className="chat-send" type="submit" disabled={isSending || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
