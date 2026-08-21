from dataclasses import dataclass

from transformers import pipeline

_MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"

# Loaded once per process on first use, not per-request -- this is a ~66M
# parameter model, small enough to keep resident in memory for the life
# of the app instead of reloading it on every message.
_classifier = None


@dataclass
class EmotionResult:
    primary_emotion: str
    confidence: float
    secondary_emotions: list[dict[str, float]]


def _get_classifier():
    global _classifier
    if _classifier is None:
        _classifier = pipeline("text-classification", model=_MODEL_NAME, top_k=None)
    return _classifier


def classify_emotion(text: str) -> EmotionResult:
    scores = _get_classifier()(text)[0]
    scores.sort(key=lambda s: s["score"], reverse=True)

    primary = scores[0]
    secondary = [
        {"label": s["label"], "score": round(s["score"], 4)} for s in scores[1:4]
    ]

    return EmotionResult(
        primary_emotion=primary["label"],
        confidence=round(primary["score"], 4),
        secondary_emotions=secondary,
    )
