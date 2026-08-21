import json
import logging
from dataclasses import dataclass

from openai import APIError, OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

# Short timeout, no retries: this call gates a safety decision, so on the
# free-tier's shared rate limit it must fail fast and fall back to the
# keyword layer rather than leaving the user waiting tens of seconds while
# the SDK retries with the provider's 24s backoff.
_client = OpenAI(
    base_url=settings.openrouter_base_url,
    api_key=settings.openrouter_api_key,
    timeout=10.0,
    max_retries=0,
)

# Deliberately contains no specific hotline/number -- the briefing is explicit
# that hallucinated crisis resources are unacceptable, and we don't yet have a
# verified, per-region resource list to draw from. This mirrors the existing
# design's own placeholder ("[ LOCAL CRISIS LINE -- CONFIGURED PER REGION AT
# DEPLOYMENT ]") rather than inventing something more specific.
SAFETY_OVERRIDE_MESSAGE = (
    "Something in what you wrote makes me concerned about your immediate wellbeing. "
    "I want to be honest with you: I'm an AI, and I can't keep you safe -- but there "
    "are people who can.\n\n"
    "Please consider reaching out to someone you trust right now -- a friend, a family "
    "member, anyone who can be with you. If you'd rather talk to a trained professional, "
    "a local crisis line or mental health service is usually free and confidential.\n\n"
    "If you are in immediate danger, please contact your local emergency services or go "
    "to the nearest emergency department. You don't have to go through this alone."
)

# Starting point only, not exhaustive -- plain substring matching, so it will
# miss typos, indirect phrasing, and languages other than English, and it can
# also false-positive on quoted/negated text ("I don't want to kill myself").
# That's an intentional bias: a false positive here just shows the safety
# screen unnecessarily, a false negative misses someone who needed it, so this
# list is written to over-trigger rather than under-trigger. This should be
# reviewed against real evaluation data before being treated as reliable.
#
# Patterns are written WITHOUT apostrophes -- _normalize() strips them from
# the input before matching, so "don't"/"dont"/"do not" all match the same
# pattern instead of needing every contraction spelled out separately.
_LEVEL_3_PATTERNS = [
    "kill myself", "killing myself", "end my life", "ending my life",
    "want to die", "wish i was dead", "wish i were dead",
    "dont want to be alive", "do not want to be alive", "dont want to live",
    "do not want to live", "want it all to end", "want it to end",
    "suicide", "suicidal", "hurt myself", "hurting myself", "harming myself",
    "self-harm", "self harm", "cutting myself", "no reason to live",
    "no point in living", "life isnt worth living", "life is not worth living",
    "better off dead", "better off without me", "cant go on", "can not go on",
]

_LEVEL_2_PATTERNS = [
    "cant take this anymore", "cant take it anymore",
    "everything feels pointless", "nothing matters anymore",
    "i give up", "im falling apart", "completely hopeless",
    "no hope left",
]


def _normalize(text: str) -> str:
    lowered = text.lower()
    for quote_char in ("'", "’", "‘"):
        lowered = lowered.replace(quote_char, "")
    return lowered

_RISK_SYSTEM_PROMPT = """You are a safety classifier for a mental wellbeing support app. \
Read the user's message and classify their immediate risk level based on this message. \
Respond with ONLY a JSON object, no other text, in exactly this shape:

{"risk_level": <0, 1, 2, or 3>, "rationale": "<one short sentence>"}

Risk levels:
0 = normal conversation, no signs of distress
1 = mild emotional distress (stress, sadness, worry)
2 = significant distress (hopelessness, feeling overwhelmed, giving up on things mattering)
3 = potential self-harm or crisis (any indication of suicidal thoughts, self-harm, wanting \
to die, or being in immediate danger)

When in doubt between two levels, choose the higher one. Do not add any text outside the \
JSON object."""


@dataclass
class RiskResult:
    risk_level: int
    method: str
    matched_terms: list[str] | None
    rationale: str | None


def _keyword_risk_check(text: str) -> tuple[int, list[str]]:
    lowered = _normalize(text)

    matched_3 = [p for p in _LEVEL_3_PATTERNS if p in lowered]
    if matched_3:
        return 3, matched_3

    matched_2 = [p for p in _LEVEL_2_PATTERNS if p in lowered]
    if matched_2:
        return 2, matched_2

    return 0, []


def _llm_risk_check(text: str) -> tuple[int, str | None]:
    response = _client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": _RISK_SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
    )
    raw = response.choices[0].message.content or ""
    try:
        data = json.loads(raw)
        return int(data["risk_level"]), str(data.get("rationale") or "") or None
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        logger.warning("Could not parse LLM risk classification output: %r", raw)
        return 0, None


def assess_risk(text: str) -> RiskResult:
    keyword_level, matched_terms = _keyword_risk_check(text)

    try:
        llm_level, rationale = _llm_risk_check(text)
    except APIError:
        logger.exception("LLM risk classification call failed; using keyword result only")
        llm_level, rationale = 0, None

    final_level = max(keyword_level, llm_level)

    if keyword_level > 0 and llm_level > 0:
        method = "combined"
    elif keyword_level > 0:
        method = "keyword"
    elif llm_level > 0:
        method = "llm"
    else:
        method = "none"

    return RiskResult(
        risk_level=final_level,
        method=method,
        matched_terms=matched_terms or None,
        rationale=rationale,
    )
