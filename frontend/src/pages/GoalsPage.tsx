import { useEffect, useState, type FormEvent } from "react";
import { createGoal, deleteGoal, listGoals, toggleGoalToday } from "../api/client";
import type { Goal } from "../api/types";
import { BottomNav } from "../components/BottomNav";
import { ChatFAB } from "../components/ChatFAB";
import "./GoalsPage.css";

function lastSevenDays(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const WEEK = lastSevenDays();
const TODAY = WEEK[WEEK.length - 1];

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listGoals()
      .then(setGoals)
      .catch(() => setError("Couldn't load your goals."))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setIsCreating(true);
    setError(null);
    try {
      const goal = await createGoal(title);
      setGoals((prev) => [...prev, goal]);
      setNewTitle("");
    } catch {
      setError("Couldn't save that goal.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggle(goal: Goal) {
    const wasDone = goal.completed_dates.includes(TODAY);
    // Optimistic update -- the streak strip should feel instant.
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id
          ? {
              ...g,
              completed_dates: wasDone
                ? g.completed_dates.filter((d) => d !== TODAY)
                : [...g.completed_dates, TODAY],
            }
          : g,
      ),
    );
    try {
      await toggleGoalToday(goal.id);
    } catch {
      // Revert on failure.
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id
            ? {
                ...g,
                completed_dates: wasDone
                  ? [...g.completed_dates, TODAY]
                  : g.completed_dates.filter((d) => d !== TODAY),
              }
            : g,
        ),
      );
      setError("Couldn't update that goal right now.");
    }
  }

  async function handleDelete(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    try {
      await deleteGoal(goalId);
    } catch {
      setError("Couldn't delete that goal. Refresh and try again.");
    }
  }

  return (
    <div className="goals-page">
      <p className="goals-eyebrow">Small steps</p>
      <h1 className="goals-heading">Goals</h1>
      <p className="goals-subtitle">
        Small, achievable actions -- not a performance record. Missing a day doesn't reset anything.
      </p>

      <form className="goals-new-form" onSubmit={handleCreate}>
        <input
          className="goals-new-input"
          type="text"
          placeholder="e.g. Walk for 10 minutes"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          disabled={isCreating}
          maxLength={255}
        />
        <button className="goals-new-button" type="submit" disabled={isCreating || !newTitle.trim()}>
          Add goal
        </button>
      </form>

      {error && <p className="goals-error">{error}</p>}

      {isLoading ? (
        <p className="goals-empty">Loading...</p>
      ) : goals.length === 0 ? (
        <p className="goals-empty">
          No goals yet. Start with something small you could actually do today.
        </p>
      ) : (
        <div className="goals-panel">
        <div className="goals-list">
          {goals.map((goal) => {
            const doneToday = goal.completed_dates.includes(TODAY);
            return (
              <div className="goal-card" key={goal.id}>
                <button
                  className={`goal-checkbox ${doneToday ? "checked" : ""}`}
                  onClick={() => handleToggle(goal)}
                  aria-label={doneToday ? "Mark not done today" : "Mark done today"}
                >
                  {doneToday ? "✓" : ""}
                </button>
                <div className="goal-card-body">
                  <p className="goal-title">{goal.title}</p>
                  <div className="goal-streak">
                    {WEEK.map((day) => (
                      <span
                        key={day}
                        className={`goal-streak-dot ${goal.completed_dates.includes(day) ? "filled" : ""} ${day === TODAY ? "is-today" : ""}`}
                        title={day}
                      />
                    ))}
                  </div>
                </div>
                <button
                  className="goal-delete"
                  onClick={() => handleDelete(goal.id)}
                  aria-label="Delete goal"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
        </div>
      )}

      <BottomNav />
      <ChatFAB />
    </div>
  );
}
