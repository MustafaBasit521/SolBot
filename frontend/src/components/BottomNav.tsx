import { useLocation, useNavigate } from "react-router-dom";
import "./BottomNav.css";

const ITEMS = [
  { path: "/", label: "Home" },
  { path: "/check-in", label: "Check-in" },
  { path: "/patterns", label: "Patterns" },
  { path: "/settings", label: "Settings" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      <span className="bottom-nav-brand" onClick={() => navigate("/")}>
        ☀ Sol
      </span>
      <div className="bottom-nav-items">
        {ITEMS.map((item) => (
          <button
            key={item.path}
            className={`bottom-nav-item ${location.pathname === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <span className="bottom-nav-badge">Research prototype</span>
    </nav>
  );
}
