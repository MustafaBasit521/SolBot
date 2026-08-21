import logging

from openai import OpenAI

from app.core.config import settings
from app.prompts.system_prompt import SYSTEM_PROMPT

logger = logging.getLogger(__name__)

_client = OpenAI(base_url=settings.openrouter_base_url, api_key=settings.openrouter_api_key)


def generate_reply(history: list[dict[str, str]], strategy_guidance: str | None = None) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if strategy_guidance:
        messages.append({"role": "system", "content": strategy_guidance})
    messages.extend(history)

    response = _client.chat.completions.create(model=settings.llm_model, messages=messages)
    reply = response.choices[0].message.content

    if not reply:
        logger.error("LLM returned an empty reply. Raw response: %s", response)
        raise ValueError("LLM returned an empty reply")

    return reply
