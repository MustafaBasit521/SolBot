import { useState } from "react";
import { EXERCISES, type Exercise } from "../lib/exercisesContent";
import { BottomNav } from "../components/BottomNav";
import "./ExercisesPage.css";

const CATEGORIES: Exercise["category"][] = ["Breathing", "Grounding", "CBT worksheet"];

export function ExercisesPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="exercises-page">
      <p className="exercises-eyebrow">Guided exercises</p>
      <h1 className="exercises-heading">A few things you can try</h1>
      <p className="exercises-subtitle">
        Static, written content -- not generated per conversation. Tap one to see the steps.
      </p>

      {CATEGORIES.map((category) => (
        <div key={category}>
          <p className="exercises-category">{category}</p>
          <div className="exercises-grid">
            {EXERCISES.filter((e) => e.category === category).map((exercise) => {
              const isOpen = openId === exercise.id;
              return (
                <div className="exercise-card" key={exercise.id}>
                  <button
                    className="exercise-title-row"
                    onClick={() => setOpenId(isOpen ? null : exercise.id)}
                  >
                    <span>
                      <p className="exercise-title">{exercise.title}</p>
                      <p className="exercise-summary">{exercise.summary}</p>
                    </span>
                    <span className="exercise-toggle">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <ol className="exercise-steps">
                      {exercise.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <BottomNav />
    </div>
  );
}
