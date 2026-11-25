import { useNavigate } from "react-router-dom";
import "./ChatFAB.css";

// A persistent shortcut into chat from anywhere in the app, not just the
// Home screen's "Start text chat" button. Doesn't create a conversation
// here -- that only happens once a first message is actually sent, so
// clicking this never leaves an empty entry in "Recent conversations".
export function ChatFAB() {
  const navigate = useNavigate();

  return (
    <button
      className="chat-fab"
      onClick={() => navigate("/chat/new")}
      aria-label="Start a chat with Sol"
    >
      💬
    </button>
  );
}
