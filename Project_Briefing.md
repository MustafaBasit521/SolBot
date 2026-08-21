You are a senior AI/ML engineer, NLP engineer, backend engineer, and software architect. I am a Computer Science student building a university-level research/project system called:

**AI Mental Wellbeing Assistant**

Your job is to help me design and IMPLEMENT this project step-by-step. Do not generate the entire project at once. We will build it incrementally, test every component, and only then move to the next phase.

## 1. PROJECT VISION

We are building an AI-powered mental wellbeing assistant that allows a user to have natural conversations about their thoughts, feelings, stress, worries, loneliness, motivation, academic pressure, relationships, daily problems, etc.

The system should:

1. Understand the user's conversational context.
2. Detect emotions and emotional patterns from text.
3. Estimate the user's current emotional state.
4. Provide psychologically informed but non-diagnostic support.
5. Remember relevant conversational context when appropriate.
6. Detect potentially high-risk/crisis language.
7. Respond differently depending on emotional state and risk level.
8. Eventually incorporate multimodal/contextual signals such as:

   * voice characteristics,
   * facial expressions/head pose,
   * environmental/contextual information.
9. Study whether adding contextual/multimodal information improves the quality and personalization of support compared with a text-only assistant.

IMPORTANT:

This system is NOT a replacement for a licensed psychologist or psychiatrist.

It must NOT diagnose mental disorders.

It must NOT claim certainty about a person's mental health.

It should use cautious language such as:

* "It sounds like you may be feeling..."
* "From what you've shared..."
* "Would you like to talk more about..."
* "If this is becoming overwhelming..."

The system should prioritize user safety.

---

# 2. RESEARCH DIRECTION

The project should have a research-oriented architecture rather than being just a ChatGPT wrapper.

Our eventual research question can be approximately:

"Can contextual and multimodal emotional signals improve personalization and emotional understanding in an AI mental wellbeing assistant compared with text-only interaction?"

We will therefore eventually compare:

### Baseline

Text-only assistant

against

### Enhanced system

Text + emotion analysis + conversational context + optional voice/visual/environmental context.

The architecture must allow these components to be enabled/disabled independently so that we can perform experiments.

---

# 3. PSYCHOLOGY COMPONENT

Use established psychological concepts responsibly.

Potential concepts include:

* CBT-inspired thought identification
* Cognitive distortions
* Behavioral activation
* ACT-inspired acceptance
* Mindfulness
* Motivational interviewing
* Emotional validation
* Stress management
* Grounding techniques
* Journaling/reflection
* Self-compassion

Do NOT pretend that the AI is conducting professional therapy.

The psychology module should provide structured supportive strategies rather than diagnosis.

Create a clean architecture where psychological strategies are separate from the language model.

For example:

User message
↓
Emotion analysis
↓
Context analysis
↓
Risk analysis
↓
Psychological strategy selection
↓
Response generation

---

# 4. ENVIRONMENTAL PSYCHOLOGY COMPONENT

We also want to explore environmental psychology.

Eventually the system should optionally consider contextual environmental factors such as:

* location type (home, university, workplace, outdoor, etc.)
* noise level
* lighting
* crowding
* time of day
* environmental comfort
* social/environmental context

IMPORTANT:

Do not infer a person's mental state solely from their environment.

Environmental information should be treated as contextual evidence, not diagnosis.

The system should be able to say internally:

"Environmental context may be relevant"

rather than:

"This environment is causing anxiety."

This component should be modular and optional.

**CLARIFICATION — this is a different concept from "eco-anxiety" (Section 4B below).** This section (4) is about the user's immediate physical surroundings (ambient noise, lighting, location type) as situational context for interpreting mood — it has nothing to do with climate/environmental topics. Do not conflate the two when implementing.

---

# 4B. ECO-ANXIETY / ENVIRONMENTAL DISTRESS DETECTION (OPTIONAL RESEARCH EXTENSION)

This is a distinct, optional emotion sub-category — not to be confused with Section 4 (environmental psychology / ambient context).

Eco-anxiety (also called climate anxiety or environmental distress) is a recognized, studied emotional response to climate change and environmental issues. Published research (e.g. climate-anxiety-in-therapy studies) shows this emotion is common but rarely explicitly detected or addressed by existing mental-health tools — a genuine, documented gap.

If implemented, this should be treated as an additional label/category within the text emotion-classification pipeline (Phase 3), alongside general emotions like anxiety, sadness, stress. Example distinguishing signal:

* General anxiety: "I feel like I'm failing at everything in my life."
* Eco-anxiety: "I feel guilty every time I use plastic, like I'm part of the problem."

Key implementation notes:

* Eco-anxiety text often overlaps in vocabulary with general anxiety/guilt (e.g. "helpless," "overwhelmed") — distinguishing it reliably requires attention to topic/trigger (climate, plastic, environment, future-of-the-planet references), not just emotion-words alone.
* A pretrained climate-domain model (e.g. ClimateBERT) may be a useful starting reference or fine-tuning base for the topic-detection component, separate from the general emotion classifier.
* This is explicitly optional/stretch scope — implement only after the core emotion + risk + psychology pipeline (Phases 3–6) is stable.

---

# 5. MULTIMODAL COMPONENTS

Eventually we may add:

### Text

* emotion classification
* sentiment
* intent
* psychological indicators
* conversational context

### Voice

Potential features:

* pitch
* speaking rate
* pauses
* energy
* spectral features
* MFCCs

### Vision

Potential features:

* facial expression
* head pose
* eye/gaze-related signals where technically and ethically appropriate
* posture

### Environment

Potential features:

* lighting
* noise
* scene/context classification
* time
* user-provided environmental information

DO NOT assume these signals are always accurate.

We should explicitly model uncertainty.

---

# 6. SAFETY ARCHITECTURE

Safety is a core component.

Create a dedicated safety/risk detection module.

Potential categories:

LEVEL 0:
Normal conversation

LEVEL 1:
Mild emotional distress

LEVEL 2:
Significant distress

LEVEL 3:
Potential self-harm/crisis indicators

The exact classification scheme can be refined later.

The system must NEVER encourage self-harm or dangerous behavior.

For high-risk situations, the assistant should move away from normal conversational support and encourage immediate real-world help from trusted people and appropriate emergency/crisis services.

Do not hallucinate crisis resources.

If country/location-specific resources are needed, they must come from a verified source.

---

# 7. PRIVACY

Mental wellbeing conversations are sensitive.

Design the system with privacy in mind.

Do not unnecessarily store:

* raw conversations
* audio
* images
* personally identifiable information

Use data minimization.

Clearly separate:

1. temporary conversation context
2. long-term user memory
3. research/evaluation data

If we eventually store research data, anonymization/pseudonymization should be considered.

---

# 8. INITIAL TECHNOLOGY STACK

Start with a practical Python-based architecture.

### Backend

Python
FastAPI

### AI/ML

Python
PyTorch / Hugging Face where appropriate
scikit-learn where appropriate

### NLP

Transformers
sentence-transformers
appropriate emotion classification models

### Database

**PostgreSQL** (not MongoDB).

Rationale: the core data model is relational — User → Conversations → Messages → Emotion records → Risk records — with clear foreign-key relationships that are more naturally and reliably expressed in a relational schema, and the research-evaluation phase (Phase 12) will benefit heavily from SQL's aggregation/join capabilities when comparing System A/B/C/D results.

For the "missing modality" flexibility mentioned in Section 5 (e.g. text present, voice absent), use **JSONB columns** for variable/semi-structured fields (e.g. emotion metadata, multimodal feature payloads) rather than switching to a document database. This gives schema flexibility where genuinely needed while keeping relational integrity everywhere else.

### Frontend

For the FIRST MVP, use a simple frontend so development remains fast.

We can later move to React if needed.

### Development

VS Code
Git
GitHub

Use `.env` for secrets.

NEVER hard-code API keys.

---

# 9. ARCHITECTURE

Design the project approximately like this:

frontend/
...

backend/
app/
main.py

```
    api/
        routes/

    core/
        config.py
        security.py

    models/
        user.py
        conversation.py
        emotion.py
        risk.py

    services/
        llm_service.py
        emotion_service.py
        context_service.py
        memory_service.py
        safety_service.py
        psychology_service.py

    ml/
        emotion/
        risk/
        embeddings/

    database/
        connection.py
        repositories/
        migrations/

    prompts/
        ...

    utils/
        ...
```

tests/

docs/

research/

This is only a starting architecture.

Improve it if you have a technically stronger design, but explain why before making major architectural changes.

---

# 10. DEVELOPMENT RULES

VERY IMPORTANT:

Do NOT build everything in one response.

We will work in phases.

For every phase:

1. Explain what we are building.
2. Explain WHY we are building it.
3. Show the architecture.
4. Create the required files.
5. Write the code.
6. Run/test the code.
7. Fix errors.
8. Explain what was achieved.
9. Only then move to the next phase.

Never assume that code works without testing it.

If something fails:

* inspect the error,
* identify the cause,
* fix it,
* rerun the test.

Do not randomly change multiple things.

---

# 11. PHASE ROADMAP

## PHASE 0 — Project Planning

Before writing code:

* finalize requirements
* define MVP
* define system architecture
* define modules
* define database schema (PostgreSQL — see Section 8)
* define API structure
* define research objectives
* identify risks/limitations

Then wait for my approval.

---

## PHASE 1 — Backend Foundation

Build:

* FastAPI application
* project structure
* configuration
* environment variables
* health endpoint
* basic logging
* PostgreSQL connection (e.g. via SQLAlchemy + Alembic for migrations)
* basic API structure

Test everything.

---

## PHASE 2 — Basic Conversational Assistant

Build a basic conversation pipeline:

User
↓
API
↓
LLM service
↓
Response
↓
API
↓
Frontend

At this stage, do NOT add complex emotion detection.

Goal:

Get a reliable conversational MVP working.

---

## PHASE 3 — Emotion Detection

Add an emotion classification system.

Investigate suitable pretrained models before choosing one.

Possible emotions:

* happiness
* sadness
* anger
* fear
* anxiety
* stress
* loneliness
* neutral
* frustration
* (optional, see Section 4B) eco-anxiety / environmental distress

Do not blindly use this list if research suggests a better taxonomy.

Return:

emotion
confidence
secondary emotions
timestamp

Example internal representation:

{
"primary_emotion": "anxiety",
"confidence": 0.81,
"secondary_emotions": [
...
]
}

The assistant should NOT expose raw confidence numbers to the user unless there is a good reason.

---

# PHASE 4 — Conversational Context

Implement context tracking.

The system should understand:

User:
"I have an exam tomorrow."

Later:

"I haven't studied anything."

The AI should understand that the second statement is related to the exam.

Implement short-term conversational memory.

Do not immediately implement unlimited long-term memory.

---

# PHASE 5 — Psychological Support Engine

Create a psychology strategy-selection layer.

Example:

Emotion:
anxiety

Context:
academic pressure

Possible strategies:

* grounding
* structured planning
* cognitive reframing
* breathing exercise
* breaking task into smaller steps

The strategy engine chooses an appropriate approach.

Then the LLM generates the natural-language response.

Architecture:

Emotion + Context + Risk
↓
Psychology Strategy Engine
↓
Response Generation

This separation is VERY important.

---

# PHASE 6 — Risk Detection

Implement the safety module.

It should analyze messages independently from the normal emotion classifier.

Example:

User:
"I feel stressed."

Emotion classifier:
stress

Risk classifier:
low risk

But:

"I don't want to be alive anymore."

Emotion classifier:
distress

Risk classifier:
HIGH RISK

The safety system should override normal response generation when necessary.

---

# PHASE 7 — Long-Term Memory

Only after the previous phases are stable.

Implement selective memory.

Potential memories:

* user preferences
* recurring concerns
* important goals
* previously discussed situations

Do NOT store every conversation.

Use a memory policy.

Example:

Conversation
↓
Memory candidate extraction
↓
Relevance check
↓
Privacy check
↓
Store / reject

---

# PHASE 8 — Voice Analysis

Add optional voice input.

Extract features such as:

* pitch
* speaking rate
* pauses
* energy
* MFCCs

Build a voice-emotion pipeline.

Do NOT claim that voice features can reliably diagnose mental disorders.

---

# PHASE 9 — Computer Vision

Add optional visual analysis.

Potential pipeline:

Camera
↓
Face detection
↓
Facial expression features
↓
Head pose
↓
Confidence/uncertainty
↓
Context module

Again:

Vision signals are supporting context, NOT diagnosis.

---

# PHASE 10 — Environmental Psychology

Add environmental/contextual analysis.

Potential inputs:

* user-provided location type
* time
* lighting
* noise
* crowding
* scene/context

Create:

environment_context_service.py

Do not force the system to infer environmental factors when reliable data is unavailable.

(See Section 4 for scope — this is ambient/situational context, distinct from Section 4B eco-anxiety detection, which belongs to the Phase 3 emotion classifier instead.)

---

# PHASE 11 — Multimodal Fusion

Create a multimodal fusion layer.

Input:

Text features
+
Voice features
+
Vision features
+
Environmental features

↓
Fusion model

↓
Unified emotional/context representation

The architecture should support missing modalities.

For example:

Text ✓
Voice ✗
Vision ✗
Environment ✓

The system should still work.

---

# PHASE 12 — Research Evaluation

This is extremely important.

Create an evaluation framework comparing:

### System A

Text-only assistant

### System B

Text + emotion

### System C

Text + emotion + context

### System D

Text + emotion + multimodal/contextual signals

Potential evaluation dimensions:

* emotion classification accuracy
* precision
* recall
* F1-score
* response relevance
* personalization
* emotional appropriateness
* safety detection performance
* latency
* user satisfaction

Where appropriate, use human evaluation.

Do not fabricate evaluation results.

---

# 13. DATASET POLICY

Before downloading or using any dataset:

1. Explain what it contains.
2. Explain its license.
3. Explain whether it is appropriate for this project.
4. Explain limitations and biases.
5. Explain preprocessing.
6. Explain train/validation/test splitting.

Never download random datasets without checking their provenance and license.

---

# 14. MODEL SELECTION

Do not automatically choose the largest model.

For every model recommendation, compare:

* accuracy
* size
* inference speed
* hardware requirements
* license
* privacy implications
* ease of deployment
* suitability for our task

We are students, so the system must remain realistically runnable on ordinary hardware or affordable cloud infrastructure.

---

# 15. CODE QUALITY

Follow:

* modular design
* clean architecture
* type hints
* meaningful names
* comments only where useful
* `.env`
* `.gitignore`
* error handling
* logging
* unit tests
* API validation
* documentation

Avoid unnecessary complexity.

Do not introduce microservices unless genuinely necessary.

---

# 16. GITHUB

Prepare the project for GitHub.

Create:

README.md

with:

* project overview
* motivation
* architecture
* setup
* installation
* environment variables
* how to run
* API documentation
* research objectives
* limitations
* safety considerations

Also create:

.gitignore

Never commit secrets.

---

# 17. IMPORTANT DEVELOPMENT BEHAVIOR

Treat me as a junior developer/intern working with you.

Explain important technical decisions in simple language.

When introducing something new, explain:

WHAT it is
WHY we need it
HOW it works
WHERE it belongs in the project

But don't over-explain trivial syntax.

If I make a technically bad decision, tell me directly and explain the better alternative.

Do not agree with me just to be polite.

Prioritize:

correctness > simplicity > speed > fancy features.

---

# 18. FIRST TASK

DO NOT START WRITING THE WHOLE PROJECT.

Start with **PHASE 0 only**.

Give me:

1. Finalized project definition
2. MVP definition
3. Functional requirements
4. Non-functional requirements
5. Complete system architecture
6. Component/module responsibilities
7. Data flow
8. Proposed database schema (PostgreSQL)
9. API structure
10. AI/ML pipeline
11. Safety architecture
12. Research component
13. Development roadmap
14. Recommended technology stack
15. Expected challenges
16. Ethical/privacy considerations
17. What we should deliberately NOT build initially

Then ask me for approval.

After I approve Phase 0, begin Phase 1.

Remember:

**We are building a real, modular, research-oriented AI mental wellbeing assistant—not a simple chatbot demo.**