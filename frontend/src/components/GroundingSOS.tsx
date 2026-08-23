import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeGroundingSession, createGroundingSession } from "../api/client";
import "./GroundingSOS.css";

interface Phase {
  label: string;
  duration: number;
  scale: number;
}

// 4-7-8 breathing -- longer exhale than inhale, a well-evidenced way to
// bring down acute physiological arousal quickly. 3 rounds runs ~57s.
// The circle shrinks for the exhale rather than growing for the inhale
// (scale never exceeds 1) so it never grows past its own box and
// overlaps the round label or the skip button around it.
const PHASES: Phase[] = [
  { label: "Breathe in", duration: 4, scale: 1.0 },
  { label: "Hold", duration: 7, scale: 1.0 },
  { label: "Breathe out", duration: 8, scale: 0.72 },
];
const CYCLE_SECONDS = PHASES.reduce((sum, p) => sum + p.duration, 0);
const ROUNDS = 3;
const TOTAL_SECONDS = CYCLE_SECONDS * ROUNDS;

function phaseAt(elapsed: number): { phase: Phase; secondsLeft: number; round: number } {
  const round = Math.floor(elapsed / CYCLE_SECONDS) + 1;
  let intoCycle = elapsed % CYCLE_SECONDS;
  for (const phase of PHASES) {
    if (intoCycle < phase.duration) {
      return { phase, secondsLeft: phase.duration - intoCycle, round };
    }
    intoCycle -= phase.duration;
  }
  return { phase: PHASES[0], secondsLeft: PHASES[0].duration, round };
}

type Step = "intensity" | "breathing" | "reflect";

interface Props {
  onClose: () => void;
}

export function GroundingSOS({ onClose }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intensity");
  const [preIntensity, setPreIntensity] = useState(7);
  const [postIntensity, setPostIntensity] = useState(7);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (step !== "breathing") return;

    const tick = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= TOTAL_SECONDS) {
          setStep("reflect");
          return e;
        }
        return e + 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [step]);

  const { phase, secondsLeft, round } = phaseAt(elapsed);

  async function startBreathing() {
    setStep("breathing");
    try {
      const session = await createGroundingSession(preIntensity);
      setSessionId(session.id);
    } catch {
      // If logging fails, the exercise itself still works -- don't block it.
    }
  }

  async function finish(completed: boolean) {
    if (sessionId) {
      try {
        await completeGroundingSession(sessionId, step === "reflect" ? postIntensity : null, completed);
      } catch {
        // Non-critical -- the user's experience of the exercise doesn't depend on this.
      }
    }
    onClose();
  }

  return (
    <div className="grounding-overlay" role="dialog" aria-modal="true">
      <button className="grounding-crisis-pill" onClick={() => navigate("/crisis-help")}>
        I need help now
      </button>

      {step === "intensity" && (
        <div className="grounding-panel">
          <p className="grounding-eyebrow">Let's pause for a moment</p>
          <h2 className="grounding-heading">How intense does this feel right now?</h2>
          <p className="grounding-note">0 is completely calm, 10 is the most intense you can imagine.</p>
          <input
            type="range"
            min={0}
            max={10}
            value={preIntensity}
            onChange={(e) => setPreIntensity(Number(e.target.value))}
            className="grounding-slider"
          />
          <p className="grounding-slider-value">{preIntensity} / 10</p>
          <div className="grounding-actions">
            <button className="grounding-primary" onClick={startBreathing}>
              Try a breathing exercise with me
            </button>
            <button className="grounding-secondary" onClick={() => finish(false)}>
              Not right now
            </button>
          </div>
        </div>
      )}

      {step === "breathing" && (
        <div className="grounding-panel grounding-panel-breathing">
          <p className="grounding-eyebrow">
            Round {Math.min(round, ROUNDS)} of {ROUNDS}
          </p>
          <div className="grounding-circle-wrap">
            <div
              className="grounding-circle"
              style={{
                transform: `scale(${phase.scale})`,
                transitionDuration: `${phase.duration}s`,
              }}
            />
            <div className="grounding-circle-text">
              <p className="grounding-phase-label">{phase.label}</p>
              <p className="grounding-phase-seconds">{secondsLeft}</p>
            </div>
          </div>
          <button className="grounding-secondary" onClick={() => setStep("reflect")}>
            Skip to the end
          </button>
        </div>
      )}

      {step === "reflect" && (
        <div className="grounding-panel">
          <p className="grounding-eyebrow">You stayed with that -- that counts</p>
          <h2 className="grounding-heading">How does it feel now?</h2>
          <input
            type="range"
            min={0}
            max={10}
            value={postIntensity}
            onChange={(e) => setPostIntensity(Number(e.target.value))}
            className="grounding-slider"
          />
          <p className="grounding-slider-value">{postIntensity} / 10</p>
          <p className="grounding-note">
            Whatever that number is, it's real and worth noticing -- not a test you passed or failed.
          </p>
          <div className="grounding-actions">
            <button className="grounding-primary" onClick={() => finish(true)}>
              Continue talking to Sol
            </button>
            <button className="grounding-secondary" onClick={() => navigate("/crisis-help")}>
              I'd rather talk to a person
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
