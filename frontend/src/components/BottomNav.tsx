import { useLocation, useNavigate } from "react-router-dom";
import "./BottomNav.css";

const ITEMS = [
  { path: "/", label: "Home" },
  { path: "/check-in", label: "Check-in" },
  { path: "/patterns", label: "Patterns" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <button
          key={item.path}
          className={`bottom-nav-item ${location.pathname === item.path ? "active" : ""}`}
          onClick={() => navigate(item.path)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
