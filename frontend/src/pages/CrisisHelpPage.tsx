import { useNavigate } from "react-router-dom";
import "./CrisisHelpPage.css";

export function CrisisHelpPage() {
  const navigate = useNavigate();

  return (
    <div className="crisis-page">
      <span className="crisis-badge">Get help now</span>
      <h1 className="crisis-heading">You don't have to go through this alone</h1>
      <p className="crisis-subtitle">
        This page is always here, whether or not anything you've written triggered it. Sol is an
        AI and can't keep you safe -- but real people and services can.
      </p>

      <div className="crisis-card">
        <p className="crisis-card-title">Reach someone you trust</p>
        <p className="crisis-card-body">
          A friend, a family member, anyone who can be with you right now. You don't need the
          right words to start the conversation.
        </p>
      </div>

      <div className="crisis-card">
        <p className="crisis-card-title">A qualified professional or crisis line</p>
        <p className="crisis-card-body">
          Trained people are available to talk this through with you, usually free and
          confidential.
        </p>
        <span className="crisis-placeholder">
          [ Crisis line numbers not yet configured -- awaiting verified regional numbers ]
        </span>
      </div>

      <div className="crisis-card">
        <p className="crisis-card-title">If you are in immediate danger</p>
        <p className="crisis-card-body">
          Contact your local emergency services, or go to the nearest emergency department.
          Please don't wait this out alone.
        </p>
      </div>

      <button className="crisis-back" onClick={() => navigate("/")}>
        &larr; Back to Sol
      </button>
    </div>
  );
}
