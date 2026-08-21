import { useState } from "react";
import { createCheckIn, type CheckInInput } from "../api/client";
import {
  ENERGY_WORDS,
  MOOD_WORDS,
  OVERALL_WORDS,
  SOCIAL_WORDS,
  STRESS_WORDS,
  energyWord,
  moodWord,
  overallWord,
  socialWord,
  stressWord,
} from "../lib/checkInWords";
import { BottomNav } from "../components/BottomNav";
import "./CheckInPage.css";

interface Dimension {
  key: keyof CheckInInput;
  label: string;
  color: string;
  endpoints: [string, string];
  wordFn: (value: number) => string;
}

const DIMENSIONS: Dimension[] = [
  { key: "mood", label: "Mood", color: "var(--data-mood)", endpoints: [MOOD_WORDS[0], MOOD_WORDS[4]], wordFn: moodWord },
  { key: "stress", label: "Stress", color: "var(--data-stress)", endpoints: [STRESS_WORDS[0], STRESS_WORDS[4]], wordFn: stressWord },
  { key: "energy", label: "Energy", color: "var(--data-energy)", endpoints: [ENERGY_WORDS[0], ENERGY_WORDS[4]], wordFn: energyWord },
  { key: "social_connection", label: "Social connection", color: "var(--data-social)", endpoints: [SOCIAL_WORDS[0], SOCIAL_WORDS[4]], wordFn: socialWord },
  { key: "overall_wellbeing", label: "Overall wellbeing", color: "var(--green-base)", endpoints: [OVERALL_WORDS[0], OVERALL_WORDS[4]], wordFn: overallWord },
];

const DEFAULTS: CheckInInput = {
  mood: 50,
  stress: 50,
  energy: 50,
  social_connection: 50,
  overall_wellbeing: 50,
};

export function CheckInPage() {
  const [values, setValues] = useState<CheckInInput>(DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit() {
    setIsSaving(true);
    setSaved(false);
    try {
      await createCheckIn(values);
      setSaved(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="checkin-page">
      <p className="checkin-eyebrow">Wellbeing check-in</p>
      <h1 className="checkin-heading">Where are you right now?</h1>
      <p className="checkin-subtitle">
        Five quick reads. There's no score and no right answer -- this only helps you see your
        own patterns later.
      </p>

      <div className="checkin-cards">
        {DIMENSIONS.map((dim) => (
          <div className="checkin-card" key={dim.key}>
            <div className="checkin-card-header">
              <span className="checkin-card-label">{dim.label}</span>
              <span className="checkin-card-value" style={{ color: dim.color }}>
                {dim.wordFn(values[dim.key])}
              </span>
            </div>
            <input
              className="checkin-slider"
              style={{ "--dimension-color": dim.color } as React.CSSProperties}
              type="range"
              min={0}
              max={100}
              value={values[dim.key]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [dim.key]: Number(e.target.value) }))
              }
            />
            <div className="checkin-endpoints">
              <span>{dim.endpoints[0]}</span>
              <span>{dim.endpoints[1]}</span>
            </div>
          </div>
        ))}

        <button className="checkin-submit" onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save check-in"}
        </button>
      </div>

      {saved && <p className="checkin-saved">Saved. Thanks for checking in.</p>}

      <BottomNav />
    </div>
  );
}
