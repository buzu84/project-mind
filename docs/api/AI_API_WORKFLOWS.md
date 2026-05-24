# AI API Workflows

How each AI endpoint works internally — what it receives, what it calls, what it returns, and how it handles failures.

---

## Common Pattern

Every AI route follows this structure:

```
1. Authenticate user           → getCurrentUser()
2. Check rate limit             → checkStandardAILimit() or checkHeavyAILimit()
3. Validate input               → Zod schema
4. Verify project ownership     → Supabase query with user_id filter
5. Check mock mode              → isRealAI()
   ├─ Mock: return mock data, track usage with is_mock: true
   └─ Real: call OpenAI, track usage with token counts + cost
6. Persist result               → Insert into decisions/insights/etc. table
7. Return response              → JSON (or SSE for chat)
```

Errors at step 5 are caught, tracked via `trackAIUsageError()`, and returned as `502`.

---

## Per-Route Details

### `/api/ai/chat` — Project Chat (SSE)

**Input:**
```json
{ "projectId": "uuid", "message": "string (1–10000 chars)" }
```

**Flow:**
1. Load project metadata (name, description, target_users, market, business_model, goals)
2. Load `project_context` (detailed structured context if saved)
3. Load conversation history from `messages` table (last 50, oldest first)
4. Call RAG: `retrieveRelevantContext(message, projectId, userId)` → injects matching document chunks
5. Build system prompt with project context + RAG context
6. Stream OpenAI response via SSE (`data: "text chunk"\n\n` per token)
7. Save assistant message to `messages` table after completion

**Response:** SSE stream. Final event: `data: {"done": true, "id": "msg-uuid"}`

**RAG:** Yes — uses `src/lib/rag/` to find relevant feedback/document chunks via pgvector similarity search.

---

### `/api/ai/global-chat` — General Chat (SSE)

**Input:**
```json
{ "message": "string (1–10000 chars)" }
```

**Flow:**
1. Save user message to `global_chat_messages`
2. Load conversation history (last 50)
3. Stream OpenAI response
4. Save assistant message to `global_chat_messages`

**No project context, no RAG.** This is a general product strategy assistant.

---

### `/api/ai/prd` — PRD Generator

**Input:**
```json
{
  "projectId": "uuid",
  "productName": "string",
  "productDescription": "string (min 10 chars)",
  "targetAudience": "string (optional)"
}
```

**Flow:**
1. Verify project ownership
2. Call `generateCompletionWithUsage()` with system prompt requesting structured markdown with `##` headings
3. Insert into `decisions` table with `type: "PRD"`

**Response:**
```json
{ "id": "decision-uuid", "content": "markdown string" }
```

**Model:** `gpt-4o` (via `src/lib/openai.ts`)

---

### `/api/ai/competitive-analysis` — Competitive Analysis

**Input:**
```json
{
  "projectId": "uuid",
  "productName": "string",
  "industry": "string",
  "competitors": "string (optional)"
}
```

**Flow:**
1. Load project metadata for context enrichment
2. Build context-enriched prompt including project description, target users, market
3. Call OpenAI
4. Insert into `decisions` table with `type: "COMPETITIVE_ANALYSIS"`

**Response:** Same shape as PRD: `{ "id": "uuid", "content": "markdown" }`

---

### `/api/ai/insights` — Strategic Insights

**Input:**
```json
{ "projectId": "uuid" }
```

**Flow:**
1. Load project + `project_context` + recent feedback documents
2. Ask OpenAI for JSON with 7–12 insights (type: risk/opportunity/next_action/etc.)
3. Normalize AI output through `normalizeInsightsFromAI()` — handles inconsistent casing, missing fields
4. Save each insight to the `insights` table

**Response:**
```json
{
  "insights": [{ "title": "...", "type": "risk", "priority": "high", ... }]
}
```

---

### `/api/ai/roadmap` — Roadmap Generator

**Input:**
```json
{ "projectId": "uuid" }
```

**Flow:**
1. Load project metadata + `project_context` + recent insights
2. RAG: retrieve relevant feedback chunks
3. Ask OpenAI for structured JSON roadmap (now/next/later + 30/60/90 day plans + risks + dependencies + success metrics)
4. Parse and validate JSON response
5. Save to `roadmaps` table

**Response:**
```json
{ "roadmap": { "title": "...", "now": [...], "next": [...], ... } }
```

**DELETE handler:** Also exports `DELETE` to remove a roadmap by `?id=uuid`.

---

### `/api/ai/multi-agent-review` — Multi-Persona Review

**Input:**
```json
{
  "projectId": "uuid",
  "question": "string (10–3000 chars)",
  "inputType": "product_question" | "feature_idea",
  "includeContext": true,
  "includeRag": true,
  "includeInsights": true
}
```

**Flow:**
1. Build context from project + project_context + optional RAG + optional insights
2. Call OpenAI **4 times in parallel** — one per persona (PM, CTO, UX Researcher, Growth Marketer)
3. Each persona returns structured JSON: `{ summary, key_points, concerns, recommendations, confidence }`
4. Call OpenAI **once more** with all 4 responses for consensus synthesis
5. Return all 5 responses

**Response:**
```json
{
  "agents": {
    "pm": { "summary": "...", "key_points": [...], ... },
    "cto": { ... },
    "ux": { ... },
    "growth": { ... }
  },
  "consensus": {
    "recommendation": "recommend",
    "summary": "...",
    "risks": [...],
    "next_steps": [...]
  }
}
```

**Cost note:** This is the most expensive endpoint — 5 OpenAI calls per request. Hence heavy rate limit tier.

---

### `/api/ai/prioritize` — Feature Prioritization

**Input:**
```json
{
  "projectId": "uuid",
  "features": [{ "name": "...", "description": "..." }],
  "criteria": "string (optional)"
}
```

**Response:** `{ "id": "uuid", "content": "markdown with JSON code block" }`

Features are scored using RICE framework. Max 30 features per request.

---

### `/api/ai/score-features` — Feature Scoring

**Input:**
```json
{ "projectId": "uuid" }
```

**Flow:**
1. Load all `feature_ideas` for the project from DB
2. Load `project_context` for scoring context
3. Ask OpenAI to score each feature with RICE + ICE
4. Update each `feature_ideas` row with scores

**Response:** `{ "features": [{ "name": "...", "rice_score": 42, ... }] }`

---

### `/api/projects/[projectId]/decisions/[decisionId]/analyze` — Decision Review

**Input:** None (reads decision from DB by URL params)

**Flow:** Delegates entirely to `analyzeDecision()` in `src/lib/decisions/decision-review-service.ts`:
1. Load decision with all options, assumptions, and existing evidence
2. Retrieve relevant evidence via RAG/evidence layer
3. Build structured prompt with decision context
4. Call OpenAI for structured JSON analysis (Zod-validated)
5. Normalize AI output (assumption type enum mapping)
6. Save results using insert-before-delete strategy for safety
7. Track usage

**Response:** The full updated decision object with analysis results.

**UUID validation:** Both `projectId` and `decisionId` are validated as UUIDs before any DB query.

---

## Error Handling Across AI Routes

| Scenario | Status | Response |
|---|---|---|
| No auth session | 401 | `{ "error": "Unauthorized" }` |
| Rate limited | 429 | `{ "error": "Rate limit reached..." }` + `Retry-After` header |
| Zod validation fails | 400 | `{ "error": "Invalid input" }` or `{ "error": "field: message" }` |
| Project not owned by user | 404 | `{ "error": "Project not found" }` |
| `OPENAI_API_KEY` missing (non-mock) | 503 | `{ "error": "AI is not configured..." }` |
| OpenAI call fails | 502 | `{ "error": "AI error: <message>" }` |

All AI errors are tracked to `ai_usage` with `status: "error"` and a sanitized error message (API keys stripped).


