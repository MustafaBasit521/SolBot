import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmotionalThemes, getMoodTrend, listCheckIns, listConversations } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { CheckIn, Conversation, EmotionalTheme, MoodTrendPoint } from "../api/types";
import { BottomNav } from "../components/BottomNav";
import { ChatFAB } from "../components/ChatFAB";
import { Sparkline } from "../components/Sparkline";
import { dateLine, moodTrendCaption, relativeTime, timeOfDayGreeting } from "../lib/homeCopy";
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
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listConversations(), getMoodTrend(14), getEmotionalThemes(14), listCheckIns()])
      .then(([convos, trend, themeData, checkInData]) => {
        setConversations(convos);
        setMoodTrend(trend);
        setThemes(themeData);
        setCheckIns(checkInData);
      })
      .finally(() => setIsLoading(false));
  }, []);

  function handleStartChat() {
    // The conversation itself isn't created here -- only once the user
    // actually sends a first message, so clicking this never leaves an
    // empty "Untitled conversation" behind in the list below.
    navigate("/chat/new");
  }

  function handleQuickMood(label: string, value: number) {
    setSelectedMood(label);
    navigate(`/check-in?mood=${value}`);
  }

  const lastCheckIn = checkIns.at(-1);
  const trendCaption = moodTrendCaption(moodTrend.map((p) => p.mood));

  return (
    <div className="home-page">
      <header className="home-header">
        <div>
          <p className="home-eyebrow">{dateLine()}</p>
          <h1 className="home-heading">
            {timeOfDayGreeting()}
            {user?.display_name ? `, ${user.display_name}` : ""}
          </h1>
        </div>
        <div className="home-header-right">
          {lastCheckIn && (
            <p className="home-muted home-last-checkin">
              Last check-in: {relativeTime(lastCheckIn.created_at)}
            </p>
          )}
          <button className="home-logout" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <div className="home-grid">
        <div className="home-card home-area-mood">
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
            <button
              className="home-action home-action-primary"
              onClick={handleStartChat}
            >
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
            <button className="home-action home-action-outline" onClick={() => navigate("/journal")}>
              <span className="home-action-title">Journal</span>
            </button>
            <button className="home-action home-action-outline" onClick={() => navigate("/exercises")}>
              <span className="home-action-title">Guided exercises</span>
            </button>
            <button className="home-action home-action-outline" onClick={() => navigate("/goals")}>
              <span className="home-action-title">Goals</span>
            </button>
            <button className="home-action home-action-outline" onClick={() => navigate("/articles")}>
              <span className="home-action-title">Learn</span>
            </button>
          </div>
        </div>

        <button
          className="home-card home-env-card home-area-env"
          onClick={() => navigate("/environmental")}
        >
          <span className="home-env-icon">🌱</span>
          <span className="home-card-title">Environmental wellbeing check-in</span>
          <span className="home-muted">
            Optional. For when the state of the world is sitting heavily.
          </span>
        </button>

        <div className="home-card home-area-trend">
          <p className="home-card-title">Mood trend</p>
          {!isLoading && moodTrend.length === 0 && (
            <p className="home-muted">No check-ins yet.</p>
          )}
          {moodTrend.length > 0 && (
            <>
              <Sparkline values={moodTrend.map((p) => p.mood)} color="var(--data-mood)" />
              {trendCaption && <p className="home-muted home-trend-caption">{trendCaption}</p>}
            </>
          )}
        </div>

        <section className="home-card home-area-conversations">
          <h2 className="home-section-heading">Recent conversations</h2>
          {isLoading && <p className="home-muted">Loading...</p>}
          {!isLoading && conversations.length === 0 && (
            <p className="home-muted">No conversations yet -- start one above.</p>
          )}
          <ul className="home-list">
            {conversations.map((c) => (
              <li key={c.id}>
                <button className="home-conversation-item" onClick={() => navigate(`/chat/${c.id}`)}>
                  <span>{c.title ?? "Untitled conversation"}</span>
                  <span className="home-muted">{new Date(c.updated_at).toLocaleDateString()}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="home-card home-area-themes">
          <p className="home-card-title">Themes this fortnight</p>
          {!isLoading && themes.length === 0 && <p className="home-muted">No conversations yet.</p>}
          <div className="home-themes">
            {themes.map((t) => (
              <span className="home-theme-tag" key={t.label}>
                {t.label} {t.count}
              </span>
            ))}
          </div>
        </div>

        <div className="home-card home-reminder-card home-area-reminder">
          <p className="home-card-title">A reminder</p>
          <p className="home-muted">
            Sol offers supportive conversation and does not diagnose. If something feels urgent, a
            qualified professional or someone you trust is the better next step.
          </p>
        </div>
      </div>

      <BottomNav />
      <ChatFAB />
    </div>
  );
}
