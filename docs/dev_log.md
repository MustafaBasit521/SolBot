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
