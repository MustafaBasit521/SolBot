import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { acceptConsent } from "../lib/consent";
import "./ConsentPage.css";

export function ConsentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  function handleContinue() {
    if (!user || !checked) return;
    acceptConsent(user.id);
    navigate("/", { replace: true });
  }

  return (
    <div className="consent-page">
      <div className="consent-card">
        <p className="consent-step">Step 2 of 2 · Privacy</p>
        <h1 className="consent-heading">Before we begin</h1>
        <p className="consent-subtitle">
          Plain terms, no small print. You can change any of this later in Settings.
        </p>

        <div className="consent-item">
          <span className="consent-item-icon">📝</span>
          <div>
            <p className="consent-item-title">What gets processed</p>
            <p className="consent-item-body">
              The text you write is analysed for emotional and risk signals so Sol can respond in
              context. Nothing else is collected beyond your account details.
            </p>
          </div>
        </div>

        <div className="consent-item">
          <span className="consent-item-icon">🎙️</span>
          <div>
            <p className="consent-item-title">Voice is optional</p>
            <p className="consent-item-body">
              Voice chat isn't available yet in this version of Sol -- text conversation is the
              only input right now.
            </p>
          </div>
        </div>

        <div className="consent-item">
          <span className="consent-item-icon">🛡️</span>
          <div>
            <p className="consent-item-title">You stay in control</p>
            <p className="consent-item-body">
              Delete a single conversation or erase your whole account at any time from Settings.
              Nothing is shared outside this project.
            </p>
          </div>
        </div>

        <div className="consent-checkbox-row">
          <input
            type="checkbox"
            id="consent-checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <label className="consent-checkbox-label" htmlFor="consent-checkbox">
            I understand Sol is a supportive conversational assistant, not clinical care, and I
            consent to my text being processed as described.
          </label>
        </div>

        <button className="consent-continue" onClick={handleContinue} disabled={!checked}>
          Continue to Sol
        </button>
      </div>
    </div>
  );
}
