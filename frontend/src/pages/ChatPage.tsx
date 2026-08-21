import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ApiError,
  createConversation,
  listConversations,
  listMessages,
  sendChatMessage,
} from "../api/client";
import type { ChatResponse, Conversation, Message } from "../api/types";
import { BottomNav } from "../components/BottomNav";
import "./ChatPage.css";

const CRISIS_RISK_THRESHOLD = 3;

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Full result of the last chat turn -- drives both the compact mono
  // signals line (mobile/tablet) and the richer session-context panel
  // (desktop). One source of truth instead of duplicating fields.
  const [lastResult, setLastResult] = useState<ChatResponse | null>(null);
  // Populated both from the just-received turn (below) and, on load, from
  // the history endpoint's per-message risk_level -- a safety reply now
  // renders correctly even after a reload, not just within the session it
  // occurred in.
  const [safetyMessageIds, setSafetyMessageIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;
    setLastResult(null);
    listMessages(conversationId)
      .then((msgs) => {
        setMessages(msgs);
        // A risk-assessed user message sits immediately before the fixed
        // safety-override reply it triggered -- flag that following
        // assistant message, not the user message carrying the score.
        const flagged = new Set<string>();
        msgs.forEach((m, i) => {
          const next = msgs[i + 1];
          if (m.risk_level != null && m.risk_level >= CRISIS_RISK_THRESHOLD && next) {
            flagged.add(next.id);
          }
        });
        if (flagged.size > 0) {
          setSafetyMessageIds((prev) => new Set([...prev, ...flagged]));
        }
      })
      .catch(() => setError("Couldn't load this conversation."))
      .finally(() => setIsLoading(false));
  }, [conversationId]);

  useEffect(() => {
    listConversations().then(setConversations);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleNewConversation() {
    const conversation = await createConversation();
    navigate(`/chat/${conversation.id}`);
  }

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
      risk_level: null,
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);

    try {
      const result = await sendChatMessage(conversationId, content);
      setMessages((prev) => [...prev, result.reply]);
      if (result.risk.risk_level >= CRISIS_RISK_THRESHOLD) {
        setSafetyMessageIds((prev) => new Set(prev).add(result.reply.id));
      }
      setLastResult(result);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMessage.id));
      setDraft(content);
      setError(err instanceof ApiError ? err.message : "Sol couldn't reply right now.");
    } finally {
      setIsSending(false);
    }
  }

  const signalTags = lastResult
    ? [lastResult.emotion.primary_emotion, ...lastResult.emotion.secondary_emotions.slice(0, 2).map((s) => s.label)]
    : [];

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <h2 className="chat-sidebar-heading">Sol</h2>
        <button className="chat-new-conversation" onClick={handleNewConversation}>
          New conversation
        </button>
        <p className="chat-sidebar-section">Conversations</p>
        <ul className="chat-sidebar-list">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                className={`chat-sidebar-item ${c.id === conversationId ? "active" : ""}`}
                onClick={() => navigate(`/chat/${c.id}`)}
              >
                {c.title ?? "Untitled conversation"}
              </button>
            </li>
          ))}
        </ul>
        <button className="chat-sidebar-link" onClick={() => navigate("/patterns")}>
          Your patterns
        </button>
        <button className="chat-sidebar-link" onClick={() => navigate("/settings")}>
          Settings
        </button>
      </aside>

      <div className="chat-main">
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

        {lastResult && (
          <p className="chat-signals">
            {lastResult.emotion.primary_emotion} · risk level {lastResult.risk.risk_level}
            {lastResult.strategies.length ? ` · ${lastResult.strategies.join(", ")}` : ""}
          </p>
        )}
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

        <BottomNav />
      </div>

      <aside className="chat-context">
        <p className="chat-context-title">Session context</p>

        <div className="chat-context-card">
          <p className="chat-context-card-title">Signals in this conversation</p>
          {signalTags.length > 0 ? (
            <>
              <div className="chat-context-tags">
                {signalTags.map((tag) => (
                  <span className="chat-context-tag" key={tag}>
                    {tag.toUpperCase()}
                  </span>
                ))}
              </div>
              <p className="chat-context-note">
                Descriptive tags drawn from your wording. Not a clinical measure.
              </p>
            </>
          ) : (
            <p className="chat-context-note">
              Signals will appear here once you've said something.
            </p>
          )}
        </div>

        <div className="chat-context-card">
          <p className="chat-context-card-title">Sol remembers</p>
          <p className="chat-context-note">
            Long-term memory across conversations is still in development.
          </p>
        </div>

        <div className="chat-context-card chat-context-card-safety">
          <p className="chat-context-card-title">Safety monitoring active</p>
          <p className="chat-context-note">
            If language suggests risk to your immediate wellbeing, Sol pauses the conversation and
            shows support options.
          </p>
        </div>

        <div className="chat-context-card">
          <p className="chat-context-card-title">Environmental thread</p>
          <p className="chat-context-note">This feature is still in development.</p>
        </div>
      </aside>
    </div>
  );
}
