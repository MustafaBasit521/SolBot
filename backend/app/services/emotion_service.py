from dataclasses import dataclass

from transformers import pipeline

# GoEmotions taxonomy (27 categories + neutral) instead of the basic 7 Ekman
# emotions -- categories like "nervousness", "disappointment", "grief", and
# "remorse" map much more directly onto mental-wellbeing language than
# "sadness"/"fear"/"anger" alone.
_MODEL_NAME = "SamLowe/roberta-base-go_emotions"

# Loaded once per process on first use, not per-request.
_classifier = None


@dataclass
class EmotionResult:
    primary_emotion: str
    confidence: float
    secondary_emotions: list[dict[str, float]]


def _get_classifier():
    global _classifier
    if _classifier is None:
        # GoEmotions is multi-label (a message can be both "disappointment"
        # and "nervousness" at once) -- sigmoid gives independent per-label
        # probabilities, unlike softmax, which would force them to sum to 1
        # as if only one emotion could be true.
        _classifier = pipeline(
            "text-classification",
            model=_MODEL_NAME,
            top_k=None,
            function_to_apply="sigmoid",
        )
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
