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

---

## 2026-08-21 — Frontend scaffold: auth + home + chat

**What:** A Vite + React + TypeScript frontend (`frontend/`) with a
login/signup screen, a home screen (start chat / recent conversations),
and the chat screen -- the first slice of the UI wired to the real
backend, not mocked data.

**Why:** The backend had a working, tested API with no way to actually
use it as an end user. This proves the whole stack end-to-end in a real
browser, not just via curl.

**How:**
- Chose React/TS over the briefing's "simple frontend for MVP" note --
  the actual designs are a genuine multi-screen SPA (bottom nav, chat,
  voice, check-in, patterns, settings) with real client state, which
  doesn't fit a static-page approach anymore now that there's a real
  auth+chat API behind it.
- Plain CSS with custom properties (`index.css`) for design tokens
  (cream background, dark teal primary, coral accent, serif headings)
  instead of a UI framework -- the design is custom enough that a
  component library wouldn't save much and would fight the look.
- `src/api/client.ts` -- typed fetch wrapper, stores the JWT in
  `localStorage`, attaches `Authorization: Bearer` automatically, throws
  a typed `ApiError` with the backend's `detail` message on failure.
- `src/auth/AuthContext.tsx` + `ProtectedRoute` -- loads the current
  user from a stored token on app start, redirects to `/login` if
  there isn't one or it's invalid.
- Three screens: `LoginPage` (combined login/signup toggle -- full
  parity with the design's separate 2-step consent screen is a later
  pass), `HomePage` (start chat, recent conversations list),
  `ChatPage` (message thread, optimistic user-message display, shows
  the detected emotion/risk/strategies as a small signals line -- a
  rough stand-in for the design's "Session context" panel).

**Where:** `frontend/src/api/`, `frontend/src/auth/`,
`frontend/src/pages/`, `frontend/src/components/ProtectedRoute.tsx`

**Bug found and fixed while testing in a real browser (Playwright,
`chromium-cli` wasn't available so used Playwright directly):** signup
silently failed on first attempt -- the backend had **no CORS
middleware**, so the browser's preflight `OPTIONS /api/users` request
got a 405 and the real `POST` never fired. This didn't show up in any
of our earlier curl-based testing because curl doesn't send CORS
preflight requests -- only real browsers do. Added `CORSMiddleware` to
`main.py` with an env-configurable `CORS_ORIGINS` list. Also fixed a
smaller cosmetic bug found in the same pass: the chat screen's "Loading
conversation..." label could linger next to an already-rendered message
if the user sent a message before the initial history fetch resolved.

**Tested end-to-end in a real headless browser against the live
backend + Neon DB + OpenRouter:** signed up, logged in, landed on Home,
started a new chat, sent a real message, and watched the actual reply
render with the correct emotion/risk/strategy signals shown
(`disappointment · risk level 1 · emotional_validation,
cognitive_reframing, task_breakdown`) -- confirming the whole pipeline
from browser to LLM and back with no mocking anywhere. Screenshots
taken at each step; zero console errors.

**Not done yet:** matching the actual design screens pixel-for-pixel
(bottom nav, voice screen, check-in, patterns/insights, settings, the
dedicated crisis-override screen styling -- risk-3 replies currently
render as a normal assistant bubble rather than the design's distinct
dark safety screen), the eco-anxiety "in development" placeholder.

---

## 2026-08-21 — Applied the color_structures.md design system + responsive pass

**What:** Replaced the frontend's improvised color tokens with the exact
palette from `color_structures.md` (a design system doc the user wrote:
hue-as-meaning ramps, accessibility-checked pairings, per-screen color
assignments, and explicit rules), applied it to all three existing
screens, built the dedicated Safety/support card styling this system
was clearly designed for, and verified responsiveness across mobile/
tablet/desktop viewports.

**Why:** The doc is a real, specific design system (not just "make it
look nice") -- it assigns exact hex values per screen, defines
accessibility-checked text/background pairings, and states explicit
rules (ember is safety-only, no red/green mood verdicts, research
metadata stays ink-grey and monospaced, max 2-3 accent hues per
screen). Following it precisely matters more than my own earlier
color guesses.

**How:**
- `index.css` rewritten with every ramp as a named CSS custom property
  (`--paper-*`, `--ink-*`, `--green-*`, `--clay-*`, `--moss-*`,
  `--night-*`, `--signal-*`, `--ember-*`, `--data-*`), matching the
  doc's own naming so the mapping from doc to code is traceable.
- `LoginPage` -> "01 Welcome": paper-raised gradient surface, ink-primary
  heading, ink-secondary body, a small clay-mark accent rule under the
  heading, green-base primary button.
- `HomePage` -> "03 Home": paper-app surface, green-base chat tile.
  (Eco card / mood-active / trend-point colors from the doc aren't
  applied yet since those UI elements -- environmental check-in, mood
  picker, trend chart -- don't exist yet.)
- `ChatPage` -> "04 Text chat": paper-raised surface, white AI bubble,
  green-base person bubble (the doc's per-screen color for the user's
  own outgoing bubble, distinct from the green="assistant" meaning
  higher up -- it's a UI convention for "your own message," not a
  contradiction). The signals line is now `font-mono` + `ink-quiet`,
  per the doc's explicit rule that research metadata must stay
  ink-grey and monospaced, never colored.
- **New**: a dedicated Safety/support card ("10 Safety / support" in
  the doc) for risk-level-3 replies -- night-support dark background,
  ember-action left border, ember-heading eyebrow label ("SUPPORT
  MODE"), night-text heading, and the doc's specific safety-body color
  (#A9B8B4). This closes the gap flagged in the last entry ("risk-3
  replies currently render as a normal assistant bubble").
  **Known limitation, stated in a code comment**: this flag is
  client-side session state, set only when a chat response arrives.
  Reloading an older conversation won't show a past safety reply with
  this styling, because `GET /messages` doesn't yet return risk data
  per message -- only the just-received turn is known to be safety-
  flagged. Fixing that properly means joining risk data into the
  message list endpoint, which is a separate backend task.
- Responsiveness: switched fixed pixel container widths to
  `min(100%, Npx)` and `clamp()` padding so layouts fill narrow screens
  and cap at a readable width on wide ones, and fixed a flexbox
  overflow gotcha (`min-width: 0` on the chat input, since flex items
  default to `min-width: auto` and can overflow their container).

**Where:** `frontend/src/index.css`,
`frontend/src/pages/{LoginPage,HomePage,ChatPage}.tsx`

**Tested in a real browser at three viewport sizes** (375x800 mobile,
768x1024 tablet, 1440x900 desktop), each running its own full signup ->
home -> new chat -> crisis message flow: confirmed the Safety card
renders correctly and distinctly from a normal bubble at every size,
layouts stay centered and readable with no overflow or breakage, and
zero console errors across all nine screenshots.

**Not done yet:** eco/moss (environmental thread), voice/night screen,
check-in data-hue screens, settings, about -- none of those screens
exist yet, so their assigned colors from the doc aren't applied
anywhere yet either.

---

## 2026-08-21 — Welcome email on signup

**What:** A best-effort welcome email sent via Gmail SMTP when a new
account is created.

**Why:** Requested as a signup nicety -- confirms the account exists
and gives a first, on-brand touchpoint.

**How:**
- Originally asked for "Node mailer" -- corrected to `smtplib`
  (Python's built-in email library) since Nodemailer is Node.js-only
  and our backend is Python.
- Tried `fastapi-mail` first; its install pulled a `starlette` version
  incompatible with our pinned FastAPI, breaking the backend's
  environment. Removed it and went with `smtplib` directly instead --
  zero new dependencies, so this exact class of conflict can't recur.
  Real incident, not hypothetical: while cleaning up the broken install,
  a stray command (missing the `cd`+`venv activate` prefix, since shell
  state doesn't persist between separate tool calls) accidentally hit
  the user's unrelated general-purpose venv instead of the project's,
  uninstalling a `starlette` version that an unrelated `streamlit`
  project of theirs depended on. Caught via `pip check`, fixed by
  reinstalling the exact original pinned version; `streamlit` confirmed
  importable again afterward.
- `app/services/email_service.py` -- `send_welcome_email()` never
  raises; missing SMTP config logs a warning and no-ops, a send failure
  logs and swallows the exception. Account creation must never depend
  on email delivery succeeding.
- Wired into `POST /api/users` via FastAPI's `BackgroundTasks`, so the
  email is sent after the response goes out -- signup latency isn't
  affected by SMTP round-trip time.
- Config: `SMTP_HOST`/`PORT`/`USERNAME`/`PASSWORD`/`MAIL_FROM`, all with
  safe empty-string defaults so the app still boots without them
  configured (unlike `DATABASE_URL`, which is genuinely required).

**Where:** `app/services/email_service.py`, `app/api/routes/users.py`,
`app/core/config.py`

**Tested:** called `send_welcome_email` directly against the real Gmail
account (app password, not the real Gmail password) -- completed with
no warnings or exceptions logged, consistent with a successful send.
Confirmed the backend's own venv (`fastapi`, `starlette`, `pydantic`,
etc.) matches `requirements.txt` exactly after the cleanup.

**Not done yet:** email verification gating (currently signup succeeds
regardless of whether the email arrives -- there's no "confirm your
email before logging in" flow, which wasn't asked for and would be a
separate, bigger feature if wanted later).

---

## 2026-08-21 — Check-ins, insights aggregation, and data export

**What:** Three backend pieces requested together, needed to support
screens 06 (Wellbeing check-in), 09 (Patterns/insights), and 11
(Settings' "Download my data" row).

**Why:** These were the remaining gaps between what's built and the
full 12-screen design the user shared (which matches
`color_structures.md`'s per-screen list exactly). Scoped to just what
those screens need -- not a general-purpose settings/preferences
system, since nothing else (retention policy enforcement, quiet hours,
memory toggle) has real backend behavior to control yet.

**How:**
- **Check-ins** (`check_ins` table): 5 integer sliders (mood, stress,
  energy, social_connection, overall_wellbeing), each DB-constrained to
  0-100. Stored as plain numbers -- the frontend maps them to the
  design's worded endpoints ("Low".."Bright" etc.), matching the design
  note "worded as descriptions rather than scores." `POST/GET
  /api/check-ins`, indexed on `(user_id, created_at)` for the trend
  query.
- **Insights aggregation** -- no new input data, just queries over what
  the chat pipeline already writes:
  - `GET /api/insights/mood-trend?days=14` reads straight from
    check-ins (that's literally what those sliders are for).
  - `GET /api/insights/emotional-themes?days=14` is a real SQL
    aggregation: joins `emotion_records -> messages -> conversations`,
    filters by the current user, groups by `primary_emotion`, orders by
    count. This is the first place in the project doing a genuine
    multi-table join for a feature, not just CRUD.
- **Data export** -- `GET /api/users/me/export` returns the user's
  profile, every conversation with its full message history (a new
  `list_all_messages_for_conversation`, unbounded, unlike the
  last-20-messages read the chat pipeline uses), and all check-ins, as
  one JSON document.

**Where:** `app/models/check_in.py`,
`app/database/repositories/check_in_repository.py` (new),
`app/database/repositories/emotion_repository.py` (added
`top_emotional_themes_for_user`),
`app/database/repositories/message_repository.py` (added
`list_all_messages_for_conversation`), `app/schemas/{check_in,insights}.py`,
`app/api/routes/{check_ins,insights}.py` (new),
`app/api/routes/users.py` (export endpoint)

**Tested end-to-end against the real Neon DB:** created check-ins,
confirmed out-of-range values (mood=101) correctly rejected with 422,
confirmed mood-trend returns them in order. Sent a real chat message
("I feel really disappointed in myself lately"), confirmed
emotional-themes correctly surfaced `disappointment` from it via the
join query. Confirmed export returns the full nested structure
correctly. **Also re-verified isolation** on all three new endpoints
with a second user -- empty check-ins, empty themes, empty export --
since none of these take a user-supplied ID (everything derives from
the authenticated token), but that's exactly the kind of assumption
worth actually checking rather than trusting by construction.

**Not done yet:** the rest of Settings (memory/retention toggles have
no backend behavior yet since there's no memory system), the
environmental check-in (deferred), voice (deferred).

---

## 2026-08-21 — Real `@media` breakpoints for the frontend

**What:** Converted the three page components from inline `style={}`
objects to CSS files with actual `@media` breakpoints, and used those
breakpoints to change layout, not just scale it.

**Why:** The previous responsive pass used `min()`/`clamp()` inside
inline styles, which fluidly scales a single layout but can't do
anything React inline styles fundamentally can't do -- contain a media
query. The user asked for real media queries, which meant this was a
genuine gap, not a nice-to-have: inline `style` attributes have no
mechanism for conditional CSS based on viewport width at all.

**How:**
- `LoginPage.css`, `HomePage.css`, `ChatPage.css` -- one stylesheet per
  page, imported directly (Vite handles plain CSS imports out of the
  box, no CSS-modules setup needed for this). Same design tokens
  (`var(--green-base)` etc.) as before, just as CSS classes instead of
  inline objects.
- Breakpoints at 700px and 1024-1100px (component-specific, not one
  global set) with actual layout changes, not just size scaling:
  - **Home**: recent conversations go from a stacked list (mobile) to
    a 2-column grid (tablet, >=700px) to a 3-column grid (desktop,
    >=1100px).
  - **Chat**: bubble `max-width` tightens from 80% (mobile) to 70%
    (tablet) to 60% (desktop) -- on a wide screen, a bubble that's 80%
    of the container makes for uncomfortably long lines, so the cap
    gets stricter as the container gets wider, not looser.
  - **Login**: card grows from 400px to 440px to 460px max-width with
    proportionally more padding, since there's genuinely more room to
    use on larger screens.
- Removed the now-unused `--content-width` custom property left over
  from the prior inline-style approach.

**Where:** `frontend/src/pages/{LoginPage,HomePage,ChatPage}.css` (new),
`frontend/src/pages/{LoginPage,HomePage,ChatPage}.tsx` (switched
`style` to `className`), `frontend/src/index.css` (cleanup)

**Tested at three real viewport sizes** (375/768/1440px) with a fresh
signup + 3 conversations created at each size: confirmed Home actually
renders 1/2/3 columns respectively (not just resized spacing), and Chat
bubbles are visibly narrower relative to the container at each larger
breakpoint. Zero console errors.

---

## 2026-08-22 — Check-in and Patterns screens, wired to real backend data

**What:** Screens 06 (Wellbeing check-in) and 09 (Patterns/insights)
from the design, plus a shared bottom nav (Home / Check-in / Patterns)
across Home, Chat, and both new screens so they're actually reachable.

**Why:** The backend work from two batches ago (check-ins, mood-trend,
emotional-themes) had no UI in front of it yet.

**How:**
- **Check-in** (`CheckInPage`): 5 range sliders (0-100), each with its
  own hue matching the design (`--data-mood`, `--data-stress`,
  `--data-energy`, `--data-social`, green for overall). A word-mapping
  helper (`lib/checkInWords.ts`) converts the raw 0-100 value to one of
  5 words per dimension (e.g. mood 0-20 -> "Low" .. 80-100 -> "Bright")
  -- the number itself is never shown, matching the design's "worded as
  descriptions rather than scores" note. Posts to `POST /api/check-ins`
  on save.
- **Patterns** (`PatternsPage`): a 7/14/90-day range toggle, a hand-rolled
  inline SVG line chart (no charting library -- a handful of points on
  a fixed viewBox, not worth a new dependency) plotting mood and stress
  from `GET /api/insights/mood-trend`, with the latest point on each
  line marked in clay per the design ("latest point"). Emotional themes
  render as tags from `GET /api/insights/emotional-themes`. Both cards
  have real empty states ("no check-ins yet", "no conversations yet")
  rather than just blanking out.
- **`BottomNav`** component (Home/Check-in/Patterns, active-state
  highlighting via the current route) added to Home, Chat, Check-in,
  and Patterns -- this is also what makes the two new screens reachable
  at all; without it there was no navigation path to them.
- Same pattern as the last responsive batch: CSS files with real
  `@media` breakpoints (Check-in cards go single-column -> 2-column
  grid at tablet; Patterns' mood-trend and themes cards go stacked ->
  side-by-side at tablet).

**Where:** `frontend/src/pages/{CheckInPage,PatternsPage}.tsx` (new)
+ matching `.css` files, `frontend/src/lib/checkInWords.ts` (new),
`frontend/src/components/BottomNav.tsx` (new), `frontend/src/api/client.ts`
(added check-in/insights calls), `frontend/src/api/types.ts` (added
types), `frontend/src/App.tsx` (new routes)

**Tested end-to-end in a real browser against the live backend:**
signed up, saved multiple check-ins with distinct slider values,
confirmed the word labels update live as sliders move (e.g. mood=20 ->
"Heavy", mood=90 -> "Bright"), sent a real chat message, then confirmed
Patterns correctly shows: a 3-point mood/stress line with the right
geometry (verified the actual SVG path coordinates match the expected
math for the saved values), the emotional theme tag from the chat
message, and nav active-state highlighting on every screen. Zero
console errors across all screens.

**Test-script note, not an app bug:** a generic Playwright
`text=Patterns` selector intermittently failed to trigger navigation
after several prior interactions on the page; switching to a specific
`.bottom-nav-item` locator fixed it immediately -- this was test
tooling fragility, not the app failing to navigate (confirmed by
checking `page.url()` directly, which showed the click was simply not
landing via the looser selector).

---

## 2026-08-22 — Desktop 3-pane chat shell (sidebar + chat + session context)

**What:** At desktop widths (>=1100px), the Chat screen switches from
the single scaled-up column (previous responsive batches) to the
actual 3-column shell from the original desktop design references:
a left sidebar (new conversation, conversation list, link to Patterns)
and a right "Session context" panel (signals, memory, safety,
environmental thread), with the chat thread in the middle.

**Why:** The user pointed out this was a real, separate desktop layout
in the original design references, not just a wider version of the
mobile layout -- correctly. Everything up to this point resized bubble
widths and container max-widths at breakpoints, but never actually
changed the app's information architecture at desktop width the way
the reference design does.

**How:**
- `ChatPage` now renders three siblings unconditionally
  (`.chat-sidebar`, `.chat-main`, `.chat-context`) -- the sidebar and
  context panel are `display: none` below 1100px and become a CSS grid
  (`240px minmax(0,1fr) 280px`) above it. Same page, same data, just a
  different arrangement of it -- no separate desktop-only fetch logic.
- Sidebar: reuses `listConversations`/`createConversation` (already in
  the API client), shows the active conversation highlighted, and a
  link to `/patterns`. No links to Settings/About since those pages
  don't exist yet -- a dead link would be worse than no link.
  Bottom nav is hidden at this width since the sidebar covers Home
  (via its own conversation list) and Patterns.
- Session context panel, one card per design section, **not
  uniformly real**:
  - "Signals in this conversation" -- **real**, built from the same
    `ChatResponse` already used for the mono signals line (refactored
    to keep the full result in state instead of just a formatted
    string, so both views read one source of truth).
  - "Safety monitoring active" -- **real** static copy, honest since
    risk detection genuinely runs on every message.
  - "Sol remembers" and "Environmental thread" -- **explicit stubs**
    ("still in development"), matching the same honesty standard
    already applied to eco-anxiety earlier -- these depend on
    long-term memory and eco-anxiety detection, neither of which
    exist yet. Showing fabricated content in these cards would have
    been a worse outcome than an honest placeholder.

**Where:** `frontend/src/pages/ChatPage.tsx`,
`frontend/src/pages/ChatPage.css`

**Tested at three real viewport sizes against the live backend:**
confirmed via `.isVisible()` checks (not just eyeballing) that the
sidebar/context panel are hidden at 375px and 768px and only appear at
1440px, with mobile's layout pixel-identical to before. At desktop, the
Signals panel showed real tag chips (`DISAPPOINTMENT`, `SADNESS`,
`ANNOYANCE`) matching the actual emotion classification for the
message sent during the test. Zero console errors across all three
sizes.

---

## 2026-08-22 — Settings screen, safety-card reload fix, consent gate

**What:** Three items from the running gap list, done together: a real
Settings screen (export/delete), fixing the safety card so it survives
a reload instead of only showing within the session it occurred in,
and a proper 2-step consent screen gating first access to the app.

**Why:** These were the three highest-value remaining gaps that didn't
require new deferred features (voice, memory, eco-anxiety) to build on
top of.

**Safety-card reload fix (backend + frontend):**
- `MessageOut` gained an optional `risk_level` field. `GET
  /conversations/{id}/messages` now fetches risk levels for the
  returned messages (`risk_repository.get_risk_levels_for_messages`, a
  batched `WHERE message_id IN (...)` query) and attaches them via
  `model_copy(update=...)` -- risk records exist only on **user**
  messages, so the frontend flags the **following** assistant message
  (the one immediately after a risk>=3 user message) as the safety
  card, not the message carrying the score itself.
- `ChatPage`'s history-load effect now derives `safetyMessageIds` from
  this data in addition to the current session's just-received turn.
- **Verified with an actual reload**, not just code review: sent a
  crisis message, confirmed the safety card rendered, reloaded the
  page, confirmed it was still there -- this was the specific gap
  called out in an earlier dev log entry, now closed.

**Settings screen** (`SettingsPage`): wires up backend endpoints that
already existed but had no UI --
`GET /users/me/export` (triggers a real browser file download via a
Blob + object URL, not a fake button), `DELETE /conversations/{id}`
(per-row delete in an "Erase" section), `DELETE /users/me` (account
deletion, confirmed via `window.confirm`, logs out and redirects on
success). Destructive actions styled in clay per the design's
"clay strictly for destructive rows" rule. No links to About/research
since that page doesn't exist -- a dead link is worse than none.

**Consent screen** (`ConsentPage`): the actual 2-step "Before we begin"
screen from the design (what gets processed / voice is optional / you
stay in control), checkbox-gated Continue button. Acceptance is
tracked per-user in `localStorage` (`lib/consent.ts`) -- `ProtectedRoute`
redirects to `/consent` if the current user hasn't accepted yet, and a
separate `RequireAuth` guard (auth-only, no consent check) covers the
consent route itself so it can't redirect to itself in a loop.

**Process note, not a feature, but important:** while fixing a type
error, discovered that `npx tsc --noEmit` (used for "clean compile"
checks in every prior frontend batch this session) was resolving to
the **root** `tsconfig.json`, which has `"files": []` and only project
references -- meaning it likely wasn't actually type-checking app code
this whole time. Re-ran the entire codebase with the correct command
(`npm run build`, which is `tsc -b && vite build`) after fixing the one
real error this surfaced; nothing else was hiding. Using `npm run
build` for all future verification instead of ad-hoc `tsc` calls.

**Tested end-to-end against the live backend, all in one Playwright
run:** signup correctly lands on `/consent` (not Home), Continue stays
disabled until the checkbox is checked, reloading after accepting skips
consent, a crisis message's safety card survives a full page reload,
data export triggers a real file download, and conversation delete
works with the correct confirmation message. Zero console errors.
