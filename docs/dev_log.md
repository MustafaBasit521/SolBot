# SolBot Dev Log

Running notes on what's been built, why, and where it lives — meant as
hand-off material for future-us, not a polished changelog.

---

## 2026-08-21 — Backend foundation

**What:** FastAPI app skeleton, config loading, structured logging, a
health check, and the PostgreSQL connection.

**Why:** Every later feature (chat, emotion, memory, safety) needs a
running API and a working DB connection underneath it — this is the
floor everything else stands on.

**How:**
- `app/core/config.py` uses `pydantic-settings` to load `APP_NAME`,
  `ENVIRONMENT`, `LOG_LEVEL`, `DATABASE_URL` from `.env`. `DATABASE_URL`
  has no default, so the app refuses to start if it's missing instead
  of silently pointing at nothing.
- `app/database/connection.py` creates the SQLAlchemy engine/session
  and a `Base` class that all models will attach to.
- `app/api/routes/health.py` exposes `GET /api/health` (is the app up)
  and `GET /api/health/db` (does a real `SELECT 1` against Postgres).
- Alembic (`alembic/env.py`) is wired to read the DB URL from our own
  `settings` object rather than a separately hardcoded value in
  `alembic.ini` — one source of truth for the connection string.

**Where:** `backend/app/core/config.py`, `backend/app/database/connection.py`,
`backend/app/api/routes/health.py`, `backend/alembic/`

**Database:** Neon (managed Postgres, free tier) — chosen so there's
no local Postgres install/service to manage, and it's already the
"cloud" target we'd have migrated to eventually anyway.

---

## 2026-08-21 — Core schema: User, Conversation, Message

**What:** The first real tables, as SQLAlchemy models, applied via the
first Alembic migration.

**Why:** Every conversation needs to be tied to a user and stored as
individual messages before anything (emotion detection, memory,
safety) can be layered on top.

**How:**
- `User` → `Conversation` → `Message`, in that relational hierarchy.
- UUID primary keys instead of auto-increment integers — sequential
  IDs would leak ordering/count information, which matters more here
  than in a typical app given the subject matter.
- `ON DELETE CASCADE` on both foreign keys, so deleting a conversation
  or a user's account also removes everything under it at the DB
  level — no manual cleanup code needed, and it directly backs the
  "Delete a conversation" / "Delete account and all my data" actions
  from the Settings screen design.
- Indexed `(user_id, created_at)` on conversations and
  `(conversation_id, created_at)` on messages, for fast "recent
  conversations" / "last N messages" lookups without a full scan.
- `conversations.running_summary` is a placeholder column for the
  rolling-summary approach the LLM service will use later to bound
  context size instead of resending full history.
- Deliberately no JSONB/metadata column on `messages` yet — nothing
  produces that data (no emotion pipeline exists yet), so it isn't
  added until something actually needs it.

**Where:** `backend/app/models/{user,conversation,message}.py`,
`backend/alembic/versions/be5e62729bd1_*.py`

**Tested:** Migration applied to the real Neon DB; confirmed all three
tables plus `alembic_version` exist with the expected columns.

---

## 2026-08-21 — CRUD endpoints for User, Conversation, Message

**What:** FastAPI routes + a repository layer wired to the schema
above. Create/get/delete user, create/list/get/delete conversation,
create/list messages.

**Why:** The models needed to be reachable over HTTP to be useful, and
a thin repository layer (`app/database/repositories/`) exists because
multiple future services (LLM, memory, emotion) will all need to
read/write conversations and messages — better to have one place for
that logic now than duplicate it across services later.

**How:**
- `app/schemas/` — Pydantic request/response models, kept separate
  from the DB models (e.g. `UserCreate.password` never appears in
  `UserOut`).
- `app/core/security.py` — bcrypt password hashing only (not full
  login/auth yet — just correctly populating the `hashed_password`
  column; login/JWT is a separate, later task).
- `message_repository.list_messages_for_conversation` fetches the most
  recent N messages in descending order, then reverses to chronological
  order — this is the bounded-context-window read the LLM service will
  use instead of ever pulling full history.

**Where:** `backend/app/schemas/`, `backend/app/database/repositories/`,
`backend/app/api/routes/{users,conversations,messages}.py`

**Tested end-to-end against the real Neon DB:**
- Create/get user; duplicate email → 409
- Create/list conversations for a user
- Post messages; invalid role (`"system"`) → 422 before it ever reaches
  the DB's check constraint
- Delete conversation → its messages are gone (cascade confirmed)
- Delete user → their conversations are gone (cascade confirmed)

**Deferred on purpose:** eco-anxiety/environmental-distress detection
(will ship as an "in development" placeholder in the frontend, not
built into the backend yet), full auth/login flow, and the LLM
conversational pipeline itself (next up).

---

## 2026-08-21 — Basic conversational pipeline (API -> LLM -> response)

**What:** A `POST /api/conversations/{id}/chat` endpoint that takes a
user's message, gets a reply from an LLM, and persists both sides of
the exchange.

**Why:** This is the actual conversational MVP -- everything before
this point was plumbing (schema, CRUD) with no real conversation
happening yet.

**How:**
- LLM provider: **OpenRouter**, using the `openai/gpt-oss-20b:free`
  model (OpenAI's own open-weight model, Apache 2.0 licensed) via the
  standard `openai` Python SDK pointed at OpenRouter's OpenAI-compatible
  endpoint (`base_url=https://openrouter.ai/api/v1`). Chosen over Claude
  because the user wanted a free option; over Gemini/other free tiers
  because it's a clearly-named, permissively-licensed model rather than
  a shifting grab-bag -- easier to justify in a research writeup.
  Originally tried `openai/gpt-oss-120b:free`, which OpenRouter had
  retired for free use by the time we tested (confirmed via their live
  `/api/v1/models` endpoint) -- swapped to the 20B sibling from the same
  family.
- `app/prompts/system_prompt.py` -- the only safety net in this batch.
  Encodes the cautious/non-diagnostic language rules and gently
  encourages reaching out to a real person for serious distress. There
  is **no dedicated risk-detection module yet** -- that's a distinct,
  future piece of work (a safety service that can override/short-circuit
  the normal response path), not something this prompt substitutes for.
- `app/services/llm_service.py` -- thin wrapper: builds
  `[system_prompt, ...history]`, calls the model, raises on an empty
  reply rather than silently returning nothing.
- `app/api/routes/chat.py` -- persists the user's message first (so it's
  never lost even if the LLM call fails), pulls the bounded last-20-message
  window via the existing repository, calls the LLM service, and persists
  the assistant reply. On LLM failure, returns 502 rather than a generic
  500 -- the user's message is still saved.

**Where:** `app/services/llm_service.py`, `app/prompts/system_prompt.py`,
`app/api/routes/chat.py`, `app/schemas/chat.py`,
`app/core/config.py` (`openrouter_api_key`, `llm_model`, `openrouter_base_url`)

**Tested end-to-end against the real Neon DB and the real OpenRouter API:**
- Sent "I have an exam tomorrow and I feel like I am failing at
  everything" -> got a cautious, validating reply.
- Sent a follow-up ("I haven't studied anything yet.") in the same
  conversation -> the reply correctly referenced the exam without being
  told about it again, confirming the context-window read works.
- Confirmed the 502-on-failure path actually triggers (hit it for real
  when the 120b slug 404'd) and that the user's message was still saved
  in that failure case.

**Deferred on purpose:** real risk/crisis detection (the prompt's
caution is a stopgap, not the safety module from the design), rolling
conversation summarization (context window is currently just "last 20
messages," no compression yet), emotion classification, memory/long-term
recall.

---

## 2026-08-21 — Emotion detection and risk/safety detection

**What:** Every user message now gets classified for emotion and risk
level, both persisted to their own tables, with high risk short-circuiting
the normal LLM reply in favor of a fixed safety message.

**Why:** This is the emotion-analysis / risk-analysis stage of the
pipeline from the original briefing's architecture (message -> emotion ->
context -> risk -> strategy -> response) -- everything before this batch
just had a conversational LLM with no structured understanding of what
the user was feeling or whether they were in danger.

**How:**
- **Emotion**: a local pretrained classifier
  (`j-hartmann/emotion-english-distilroberta-base`, ~66M params, 7 Ekman
  emotions + neutral) via `transformers`/`torch` (CPU-only build), loaded
  once per process rather than per-request. Chosen over routing emotion
  classification through the LLM because it's free forever, doesn't
  compete with the chat reply for OpenRouter's free-tier rate limit, and
  runs fine on this machine's CPU without a GPU. This is a starting
  choice, not a final research decision -- a GoEmotions-based model with
  richer categories is a reasonable upgrade to compare against later.
- **Risk**: two independent layers, combined by taking the higher result
  of the two (safety-first: either layer can escalate, neither can
  suppress the other).
  - A keyword/phrase layer (`app/services/safety_service.py`) -- fast,
    deterministic, zero-cost. Patterns are matched after stripping
    apostrophes from both the input and the patterns, so contractions
    match regardless of how they're typed ("don't"/"dont"/"do not").
  - An LLM-based contextual layer, prompted to return strict JSON
    (`{"risk_level": 0-3, "rationale": "..."}`), for indirect phrasing the
    keyword list would miss. Configured with `max_retries=0` and a 10s
    timeout -- this call gates a safety decision, so on a rate limit it
    needs to fail fast and fall back to the keyword layer rather than
    leaving the user waiting through a 24s provider backoff.
  - `risk_level >= 3` skips the conversational LLM entirely and returns a
    **fixed, non-generated** safety message -- reaching a trusted person /
    contacting emergency services, deliberately with **no specific
    hotline number or URL**, matching the briefing's rule against
    hallucinated crisis resources and the existing design's own
    "configured per region at deployment" placeholder.
- New tables: `emotion_records`, `risk_records`, one-to-one with
  `messages` (unique FK on `message_id`), cascade-deleted with their
  message. `secondary_emotions` and `matched_terms` are JSONB -- the
  genuinely variable-shaped fields, consistent with how JSONB was scoped
  back in the Phase 1 database decision.

**Where:** `app/services/emotion_service.py`, `app/services/safety_service.py`,
`app/models/{emotion,risk}.py`, `app/database/repositories/{emotion,risk}_repository.py`,
`app/api/routes/chat.py` (now returns `{reply, emotion, risk}` instead of
just the message)

**Bug found and fixed during testing:** the first end-to-end test of a
real crisis-level message ("I dont want to be alive anymore, I just want
it all to end") did **not** trigger the safety override -- risk came back
as level 0. Two compounding causes: the keyword list only had the
apostrophe'd "don't want to be alive," missing the no-apostrophe phrasing
the test used; and the LLM risk check hit OpenRouter's free-tier rate
limit and, with the SDK's default retry behavior, spent ~90 seconds
retrying before giving up and falling back to a keyword-only result that
itself had the gap above. Fixed by normalizing apostrophes out of both
input and patterns, adding more phrasings, and cutting the risk-check
call to `max_retries=0` / 10s timeout so a rate limit resolves in
seconds, not minutes. Re-tested afterward: same message correctly
returned `risk_level: 3, method: "combined"` and the fixed safety
message, in ~22s total.

**Known limitation, stated plainly:** the keyword list is a starting
point, not exhaustive -- plain substring matching will miss typos,
indirect language, and non-English input, and the LLM layer is only as
reliable as OpenRouter's free tier is available. This combination is a
reasonable first safety net, not a validated crisis-detection system --
it should be reviewed against real evaluation data (and ideally by
someone with relevant clinical/safety expertise) before being treated as
dependable in front of real users.

**Tested end-to-end against the real Neon DB and real OpenRouter API:**
normal message (correct low emotion/risk), level-2 distress phrase
(correctly answered by the normal LLM, override not triggered), and the
crisis-level message (correctly triggers the fixed safety response) --
all three confirmed after the fix.

---

## 2026-08-21 — Psychological strategy engine

**What:** A rule-based layer that picks 1-3 supportive strategies (from a
fixed catalog: emotional validation, cognitive reframing, self-compassion,
task breakdown, grounding, behavioral activation) based on the message's
emotion, risk level, and a few lightweight keyword/context signals, then
hands that as soft guidance into the LLM's reply -- the LLM still writes
the actual response, it's just steered rather than left to guess.

**Why:** This is the "Psychology Strategy Engine" stage from the original
briefing's architecture (Emotion + Context + Risk -> Strategy Engine ->
Response Generation). Before this, the LLM only had a generic system
prompt with no explicit psychological reasoning behind what it said.

**How:**
- `app/services/strategy_service.py` -- `STRATEGIES` dict (name -> one
  line of guidance text), regex-based signal detection (academic/deadline
  keywords, all-or-nothing language, self-critical phrasing), and
  `select_strategies()` combining emotion + risk + those signals into an
  ordered, capped list (`emotional_validation` always included as the
  baseline, at most 2 more).
- `llm_service.generate_reply()` now takes an optional `strategy_guidance`
  string, inserted as a second system-role message alongside (not
  replacing) the main persona/safety system prompt.
- New `strategy_records` table, same one-per-message pattern as emotion
  and risk (unique FK on `message_id`, cascade delete). Only created for
  non-crisis messages -- a risk-3 message gets the fixed safety response
  instead, so there's no discretionary strategy to record for it.
- `ChatResponse` now also returns `strategies: list[str]` so the selected
  strategies are visible in the API response, not just implicit in the
  reply's tone.

**Where:** `app/services/strategy_service.py`, `app/models/strategy.py`,
`app/database/repositories/strategy_repository.py`,
`app/services/llm_service.py` (added parameter),
`app/api/routes/chat.py` (wiring)

**Two more regex bugs found and fixed during testing** (same family as
the risk-keyword bug from the previous batch -- pattern matching is
fragile and testing kept catching real gaps, which is exactly why we
test before calling something done):
1. The self-critical pattern only matched contractions ("I'm such a
   failure"), not the spelled-out form ("I am such a failure") -- so the
   test message fell through to the weaker cognitive-reframing branch
   instead of self-compassion.
2. After first patching that, it *still* didn't match -- the pattern's
   alternation had a structural bug: `(such a|so) (stupid|...|a failure)`
   requires literal text like "such a a failure" (double "a"), which
   never occurs naturally. Restructured into three separate
   alternatives ("such a X", "so X", "a failure" standalone) instead of
   one combined template.
- Verified after fixing: "I have an exam tomorrow and I am such a
  failure, I always mess everything up" now correctly selects
  `[emotional_validation, self_compassion, task_breakdown]`, and a
  fear-coded message ("my heart is racing... something terrible is about
  to happen") correctly selects `[emotional_validation, grounding]` and
  the reply naturally opens with a grounding pause.

**Known limitation, stated plainly:** same caveat as the risk keyword
list -- this is a hand-written, inspectable starting point, not a
validated set of psychological rules. It should be revisited once there's
real evaluation data on which strategies actually help, per the
briefing's own emphasis on not overclaiming clinical rigor.

**Operational note (not a bug, just reality):** OpenRouter's free tier
for `openai/gpt-oss-20b:free` is a shared pool and gets rate-limited
under load -- during testing, the main conversational reply call
occasionally took 20-30+ seconds due to the provider's retry-after
backoff. This only affects the main reply (which still benefits from
retrying rather than failing fast); the risk-check call already fails
fast by design (previous batch). Worth watching if this becomes a
recurring UX problem -- the fix would be adding a paid OpenRouter key or
switching models, not a code change.

---

## 2026-08-21 — Swapped emotion classifier to GoEmotions

**What:** Replaced the 7-Ekman-emotion classifier
(`j-hartmann/emotion-english-distilroberta-base`) with a GoEmotions-based
one (`SamLowe/roberta-base-go_emotions`, 27 categories + neutral).

**Why:** The basic Ekman set (anger, disgust, fear, joy, neutral, sadness,
surprise) was too coarse for mental-wellbeing language -- everything
sad-adjacent just came back as "sadness" at ~97% confidence regardless of
whether it was disappointment, grief, or something else. GoEmotions
categories (disappointment, nervousness, remorse, grief, annoyance,
embarrassment, etc.) map much more directly onto what people actually say
in this domain, and give the strategy engine more to work with than two
label checks.

**How:**
- GoEmotions is multi-label (a message can genuinely be both
  "disappointment" and "nervousness" at once), so the pipeline is
  configured with `function_to_apply="sigmoid"` instead of the default
  softmax -- softmax would force all label probabilities to sum to 1, as
  if only one emotion could ever be true, which is the wrong model for
  this taxonomy.
- No DB schema change needed -- `emotion_records.primary_emotion` is a
  plain string column, not constrained to a fixed enum.
- Expanded `strategy_service.py`'s emotion-matching from two hardcoded
  checks (`== "fear"`, `== "sadness"`) to small sets:
  `{fear, nervousness}` -> grounding, `{sadness, disappointment, grief}`
  -> behavioral activation, `{remorse, embarrassment}` -> self-compassion
  (in addition to the existing keyword-based self-critical check).

**Where:** `app/services/emotion_service.py` (model name + sigmoid),
`app/services/strategy_service.py` (emotion sets)

**Tested end-to-end after the swap:** "I have an exam tomorrow and I feel
like I am failing at everything" now correctly comes back as
`disappointment (0.75)` with `sadness (0.23)` as secondary -- a much more
precise read than the old model's generic `sadness (0.97)` -- and still
correctly drives `[emotional_validation, cognitive_reframing,
task_breakdown]`. The fear/grounding path was re-verified unchanged
(`fear 0.90` -> `[emotional_validation, grounding]`).

**Same caveat as before:** this is still a starting choice, not a
validated taxonomy decision -- worth comparing against alternatives once
there's real evaluation data, per the briefing's own model-selection
principle (don't default to the first option without comparing
accuracy/size/speed/suitability).

---

## 2026-08-21 — Real auth (JWT) + fixed an ownership security gap

**What:** `POST /api/auth/login` issuing JWTs, and a rework of every
conversation/message/chat/user route to derive the acting user from the
token instead of trusting an ID in the URL.

**Why:** Two things needed doing together. First, users had hashed
passwords sitting in the DB with no way to actually log in. Second --
more important -- every existing route trusted whatever `user_id` or
`conversation_id` was in the URL path with **no check that it belonged to
the caller**. Anyone who obtained or guessed a UUID could read or delete
someone else's conversations and messages. Bolting JWT on top of that
without fixing it would have been pointless, so this batch closes both at
once.

**How:**
- `app/core/security.py` -- `create_access_token`/`decode_access_token`
  (PyJWT, HS256, 7-day expiry, secret from `JWT_SECRET_KEY` in `.env`,
  generated fresh with `secrets.token_urlsafe(32)` -- never reused from
  anywhere else).
- `app/api/deps.py` -- two shared dependencies:
  - `get_current_user` -- validates the Bearer token, loads the user, 401
    on anything wrong (missing/expired/garbage token, deleted user).
  - `get_owned_conversation` -- loads a conversation by ID *and* checks
    `conversation.user_id == current_user.id`, raising **404** (not 403)
    on mismatch, so a guessed ID doesn't even confirm another user's
    conversation exists.
- Route changes:
  - `POST /api/users` stays public (signup). `GET/DELETE /api/users/{id}`
    replaced with `GET/DELETE /api/users/me` -- no more passing an
    arbitrary user id at all.
  - `POST/GET /api/users/{user_id}/conversations` replaced with
    `POST/GET /api/conversations`, scoped to the token's user --
    `user_id` is never read from client input anymore, only from the
    verified token.
  - `conversations/{id}`, `conversations/{id}/messages`, and
    `conversations/{id}/chat` all now depend on `get_owned_conversation`
    instead of a raw `conversation_id` + manual lookup, so the ownership
    check can't accidentally be skipped in any one of them.

**Where:** `app/core/security.py`, `app/api/deps.py` (new),
`app/api/routes/auth.py` (new), `app/schemas/auth.py` (new),
`app/api/routes/{users,conversations,messages,chat}.py` (all reworked)

**Tested end-to-end against the real Neon DB:** registered two users,
logged in as both, confirmed wrong password -> 401, no token -> 403,
garbage token -> 401. Created a conversation as user A, then confirmed
user B gets **404** trying to read it, **404** trying to chat in it, and
user A can still read/list it normally. This is the test that actually
matters here -- it proves the isolation bug is fixed, not just that
login works.

**Not done yet:** refresh tokens / logout / token revocation (a 7-day
JWT with no revocation list is a reasonable MVP tradeoff, not a final
security posture), rate limiting on login (no lockout after repeated
failed attempts yet).
