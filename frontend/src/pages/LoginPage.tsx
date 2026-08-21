import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, registerUser } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        await registerUser(email, password, displayName || undefined);
      }
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.rule} />
        <h1 style={styles.heading}>Sol</h1>
        <p style={styles.subtitle}>
          {mode === "login" ? "Welcome back." : "A calm place to put words to how you feel."}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === "signup" && (
            <input
              style={styles.input}
              type="text"
              placeholder="Name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          style={styles.switchModeButton}
          onClick={() => {
            setError(null);
            setMode(mode === "login" ? "signup" : "login");
          }}
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>

        <p style={styles.disclaimer}>
          Sol is not a therapist and does not diagnose. It offers supportive conversation, not
          clinical care.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "linear-gradient(180deg, var(--paper-raised), #f1ede4)",
  },
  card: {
    width: "100%",
    maxWidth: "min(100%, 400px)",
    background: "var(--paper-raised)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-card)",
    padding: "clamp(24px, 6vw, 32px) clamp(20px, 5vw, 28px)",
  },
  rule: {
    width: "32px",
    height: "3px",
    background: "var(--clay-mark)",
    borderRadius: "2px",
    marginBottom: "16px",
  },
  heading: {
    fontSize: "2rem",
    color: "var(--ink-primary)",
    marginBottom: "4px",
  },
  subtitle: {
    color: "var(--ink-secondary)",
    marginTop: 0,
    marginBottom: "24px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--ink-hairline)",
    background: "var(--paper-app)",
    color: "var(--ink-primary)",
    fontSize: "1rem",
    width: "100%",
  },
  error: {
    color: "var(--clay-text)",
    fontSize: "0.9rem",
    margin: 0,
  },
  submitButton: {
    padding: "12px 14px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "var(--green-base)",
    color: "var(--paper-raised)",
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: "4px",
  },
  switchModeButton: {
    background: "none",
    border: "none",
    color: "var(--green-base)",
    marginTop: "16px",
    cursor: "pointer",
    fontSize: "0.9rem",
    padding: 0,
  },
  disclaimer: {
    color: "var(--ink-meta)",
    fontSize: "0.75rem",
    marginTop: "24px",
    marginBottom: 0,
    textAlign: "center",
  },
};
