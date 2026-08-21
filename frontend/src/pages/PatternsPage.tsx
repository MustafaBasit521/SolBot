import { useEffect, useState } from "react";
import { getEmotionalThemes, getMoodTrend } from "../api/client";
import type { EmotionalTheme, MoodTrendPoint } from "../api/types";
import { BottomNav } from "../components/BottomNav";
import "./PatternsPage.css";

const CHART_WIDTH = 300;
const CHART_HEIGHT = 100;
const CHART_MARGIN = 10;

function buildPath(values: number[]): string {
  if (values.length === 0) return "";
  const step = values.length > 1 ? (CHART_WIDTH - CHART_MARGIN * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = CHART_MARGIN + i * step;
      const y = CHART_HEIGHT - CHART_MARGIN - (v / 100) * (CHART_HEIGHT - CHART_MARGIN * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function lastPoint(values: number[]): { x: number; y: number } | null {
  if (values.length === 0) return null;
  const step = values.length > 1 ? (CHART_WIDTH - CHART_MARGIN * 2) / (values.length - 1) : 0;
  const i = values.length - 1;
  const x = CHART_MARGIN + i * step;
  const y = CHART_HEIGHT - CHART_MARGIN - (values[i] / 100) * (CHART_HEIGHT - CHART_MARGIN * 2);
  return { x, y };
}

export function PatternsPage() {
  const [days, setDays] = useState(14);
  const [moodTrend, setMoodTrend] = useState<MoodTrendPoint[]>([]);
  const [themes, setThemes] = useState<EmotionalTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([getMoodTrend(days), getEmotionalThemes(days)])
      .then(([trend, themeData]) => {
        setMoodTrend(trend);
        setThemes(themeData);
      })
      .finally(() => setIsLoading(false));
  }, [days]);

  const moodValues = moodTrend.map((p) => p.mood);
  const stressValues = moodTrend.map((p) => p.stress);
  const latestMood = lastPoint(moodValues);
  const latestStress = lastPoint(stressValues);

  return (
    <div className="patterns-page">
      <p className="patterns-eyebrow">Personal insights</p>
      <h1 className="patterns-heading">Your recent wellbeing patterns</h1>
      <p className="patterns-subtitle">
        Drawn from your check-ins and conversations. Descriptive only -- Sol does not assess or
        diagnose.
      </p>

      <div className="patterns-range">
        {[7, 14, 90].map((d) => (
          <button
            key={d}
            className={`patterns-range-button ${days === d ? "active" : ""}`}
            onClick={() => setDays(d)}
          >
            {d}D
          </button>
        ))}
      </div>

      <div className="patterns-grid">
        <div className="patterns-card">
          <div className="patterns-card-title">
            <span>Mood and reported stress</span>
            <span className="patterns-card-meta">last {days} days</span>
          </div>

          {isLoading && <p className="patterns-empty">Loading...</p>}
          {!isLoading && moodTrend.length === 0 && (
            <p className="patterns-empty">
              No check-ins yet in this window -- save one on the Check-in tab to see a trend
              here.
            </p>
          )}
          {!isLoading && moodTrend.length > 0 && (
            <>
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                width="100%"
                height="120"
                preserveAspectRatio="none"
              >
                <path
                  d={buildPath(moodValues)}
                  fill="none"
                  stroke="var(--data-mood)"
                  strokeWidth="2"
                />
                <path
                  d={buildPath(stressValues)}
                  fill="none"
                  stroke="var(--data-stress-bar)"
                  strokeWidth="2"
                />
                {latestMood && (
                  <circle cx={latestMood.x} cy={latestMood.y} r="3" fill="var(--clay-mark)" />
                )}
                {latestStress && (
                  <circle cx={latestStress.x} cy={latestStress.y} r="3" fill="var(--clay-mark)" />
                )}
              </svg>
              <div className="patterns-legend">
                <span>
                  <span
                    className="patterns-legend-dot"
                    style={{ background: "var(--data-mood)" }}
                  />
                  Mood
                </span>
                <span>
                  <span
                    className="patterns-legend-dot"
                    style={{ background: "var(--data-stress-bar)" }}
                  />
                  Stress
                </span>
              </div>
            </>
          )}
        </div>

        <div className="patterns-card">
          <div className="patterns-card-title">
            <span>Emotional themes</span>
          </div>
          {isLoading && <p className="patterns-empty">Loading...</p>}
          {!isLoading && themes.length === 0 && (
            <p className="patterns-empty">
              No conversations in this window yet -- themes show up here once you've chatted with
              Sol a bit.
            </p>
          )}
          {!isLoading && themes.length > 0 && (
            <div className="patterns-themes">
              {themes.map((t) => (
                <span className="patterns-theme-tag" key={t.label}>
                  {t.label}
                  <span className="patterns-theme-count">{t.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
