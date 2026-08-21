import re

# Guidance text handed to the LLM as soft steering, not a script -- the model
# still writes the actual reply. Keep entries short; these get concatenated
# into one system-role note, not read verbatim to the user.
STRATEGIES = {
    "emotional_validation": (
        "Prioritize validating what they're feeling before anything else -- this "
        "is the baseline for every response, regardless of anything else below."
    ),
    "cognitive_reframing": (
        "Gently notice any all-or-nothing language ('always', 'never', 'everything', "
        "'everyone') and invite them to name one specific thing, rather than agreeing "
        "with the sweeping statement."
    ),
    "self_compassion": (
        "Notice self-critical or self-blaming language and gently offer a more "
        "compassionate frame, without dismissing or minimizing what they're feeling."
    ),
    "task_breakdown": (
        "If the distress is tied to a task or deadline, offer to help break it into "
        "one small, doable next step rather than the whole thing at once -- only if "
        "it fits naturally, don't force a to-do list on them."
    ),
    "grounding": (
        "If it fits naturally, gently offer a brief grounding technique (noticing "
        "their surroundings, a short breathing pause) -- don't force a coping "
        "exercise if they haven't indicated they want one."
    ),
    "behavioral_activation": (
        "If it fits, gently invite one small, concrete next action rather than a "
        "big plan -- low-effort movement forward, not a checklist."
    ),
}

_ACADEMIC_PATTERN = re.compile(
    r"\b(exam|assignment|deadline|study|studying|homework|thesis|project due)\b", re.I
)
_DISTORTION_PATTERN = re.compile(
    r"\b(always|never|everything|everyone|no one|nothing|completely|totally)\b", re.I
)
_SELF_CRITICAL_PATTERN = re.compile(
    r"\b(?:i'?m|i am) such a (?:stupid|worthless|useless|failure)\b|"
    r"\b(?:i'?m|i am) so (?:stupid|worthless|useless)\b|"
    r"\b(?:i'?m|i am) a failure\b|"
    r"\bhate myself\b",
    re.I,
)


def select_strategies(*, primary_emotion: str, risk_level: int, text: str) -> list[str]:
    """Rule-based strategy selection. Deliberately simple and inspectable --
    a starting point to be replaced or extended once there's real evaluation
    data on which strategies actually help, not a claim of clinical rigor."""
    selected = ["emotional_validation"]

    if _SELF_CRITICAL_PATTERN.search(text):
        selected.append("self_compassion")
    elif _DISTORTION_PATTERN.search(text):
        selected.append("cognitive_reframing")

    if _ACADEMIC_PATTERN.search(text) and risk_level < 2:
        selected.append("task_breakdown")

    if primary_emotion == "fear":
        selected.append("grounding")
    elif primary_emotion == "sadness" and risk_level < 2 and len(selected) < 3:
        selected.append("behavioral_activation")

    # Cap it so the LLM gets focused guidance, not a checklist.
    return selected[:3]


def build_guidance_text(strategy_names: list[str]) -> str:
    lines = [STRATEGIES[name] for name in strategy_names if name in STRATEGIES]
    return "Guidance for this reply (weave in naturally, don't recite as a list):\n" + "\n".join(
        f"- {line}" for line in lines
    )
