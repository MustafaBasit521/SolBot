import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createConversation,
  getEmotionalThemes,
  getMoodTrend,
  listConversations,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Conversation, EmotionalTheme, MoodTrendPoint } from "../api/types";
import { BottomNav } from "../components/BottomNav";
import { Sparkline } from "../components/Sparkline";
import "./HomePage.css";

const QUICK_MOODS = [
  { label: "Low", value: 10 },
  { label: "Heavy", value: 30 },
  { label: "Steady", value: 50 },
  { label: "Light", value: 70 },
  { label: "Good", value: 90 },
];

export function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [moodTrend, setMoodTrend] = useState<MoodTrendPoint[]>([]);
  const [themes, setThemes] = useState<EmotionalTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listConversations(), getMoodTrend(14), getEmotionalThemes(14)])
      .then(([convos, trend, themeData]) => {
        setConversations(convos);
        setMoodTrend(trend);
        setThemes(themeData);
      })
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

  function handleQuickMood(label: string, value: number) {
    setSelectedMood(label);
    navigate(`/check-in?mood=${value}`);
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

      <div className="home-grid">
        <div className="home-main-col">
          <div className="home-card">
            <p className="home-card-title">How are you feeling today?</p>
            <div className="home-mood-row">
              {QUICK_MOODS.map((m) => (
                <button
                  key={m.label}
                  className={`home-mood-button ${selectedMood === m.label ? "active" : ""}`}
                  onClick={() => handleQuickMood(m.label, m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="home-actions-row">
              <button className="home-action home-action-primary" onClick={handleStartChat} disabled={isCreating}>
                <span className="home-action-title">Start text chat</span>
                <span className="home-action-subtitle">Write at your own pace</span>
              </button>
              <button className="home-action home-action-disabled" disabled>
                <span className="home-action-title">Start voice chat</span>
                <span className="home-action-subtitle">Coming soon</span>
              </button>
              <button className="home-action home-action-outline" onClick={() => navigate("/check-in")}>
                <span className="home-action-title">Full check-in</span>
              </button>
            </div>
          </div>

          <section className="home-card">
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

        <div className="home-side-col">
          <button className="home-card home-env-card" onClick={() => navigate("/environmental")}>
            <span className="home-env-icon">🌱</span>
            <span className="home-card-title">Environmental wellbeing check-in</span>
            <span className="home-muted">
              Optional. For when the state of the world is sitting heavily.
            </span>
          </button>

          <div className="home-card">
            <p className="home-card-title">Mood trend</p>
            {!isLoading && moodTrend.length === 0 && (
              <p className="home-muted">No check-ins yet.</p>
            )}
            {moodTrend.length > 0 && (
              <Sparkline values={moodTrend.map((p) => p.mood)} color="var(--data-mood)" />
            )}
          </div>

          <div className="home-card">
            <p className="home-card-title">Themes this fortnight</p>
            {!isLoading && themes.length === 0 && (
              <p className="home-muted">No conversations yet.</p>
            )}
            <div className="home-themes">
              {themes.map((t) => (
                <span className="home-theme-tag" key={t.label}>
                  {t.label} {t.count}
                </span>
              ))}
            </div>
          </div>

          <div className="home-card home-reminder-card">
            <p className="home-muted">
              Sol offers supportive conversation and does not diagnose. If something feels
              urgent, a qualified professional or someone you trust is the better next step.
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
