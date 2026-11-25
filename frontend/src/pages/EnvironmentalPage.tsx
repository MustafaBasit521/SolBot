import { useNavigate } from "react-router-dom";
import { BackArrow } from "../components/BackArrow";
import "./EnvironmentalPage.css";

export function EnvironmentalPage() {
  const navigate = useNavigate();

  return (
    <div className="env-page">
      <div className="env-card">
        <div className="env-icon">🌱</div>
        <h1 className="env-heading">Environmental wellbeing check-in</h1>
        <p className="env-body">
          This feature is still in development. It'll be an optional, separate space for worry
          about the wider state of the world -- distinct from your general check-in, and never
          scored against you.
        </p>
        <button className="env-back" onClick={() => navigate("/")}>
          <BackArrow /> Back to Home
        </button>
      </div>
    </div>
  );
}
