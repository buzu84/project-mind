# Decision Engine API

The Decision Engine is a CRUD + AI analysis system for structured product decisions. It spans 7 database tables and provides full lifecycle management: create a decision, add context, run AI analysis, review results.

---

## API Routes

All routes require authentication and verify project ownership.

| Route | Method | Purpose |
|---|---|---|
| `/api/projects/[projectId]/decisions` | `GET` | List all decisions for a project |
| `/api/projects/[projectId]/decisions` | `POST` | Create a new decision |
| `/api/projects/[projectId]/decisions/[decisionId]` | `GET` | Get decision with all child records |
| `/api/projects/[projectId]/decisions/[decisionId]` | `PATCH` | Update decision fields |
| `/api/projects/[projectId]/decisions/[decisionId]` | `DELETE` | Delete decision and all children |
| `/api/projects/[projectId]/decisions/[decisionId]/analyze` | `POST` | Run AI-powered analysis (Heavy rate limit) |

---

## Data Model

```
product_decisions
  ├── product_decision_options (3-4 per analysis)
  ├── product_assumptions (1-15 per analysis)
  ├── product_evidence (0-N from RAG)
  │     └── product_decision_evidence_links (join table)
  ├── product_decision_recommendations (1 per analysis)
  └── product_decision_agent_reviews (reserved, unused)
```

### Enum Constants (`src/lib/decisions/constants.ts`)

| Enum | Values |
|---|---|
| `DECISION_CATEGORIES` | `product`, `technical`, `growth`, `ux`, `business`, `strategy`, `other` |
| `DECISION_STATUSES` | `draft`, `under_review`, `accepted`, `rejected`, `revisit` |
| `ASSUMPTION_TYPES` | `market`, `user`, `technical`, `growth`, `pricing`, `ux`, `business`, `other` |
| `RISK_LEVELS` | `low`, `medium`, `high` |
| `EVIDENCE_STATUSES` | `unsupported`, `weak`, `moderate`, `strong` |
| `EFFORT_ESTIMATES` | `low`, `medium`, `high`, `unknown` |
| `REVERSIBILITY_LEVELS` | `low`, `medium`, `high`, `unknown` |
| `EVIDENCE_SOURCE_TYPES` | `feedback`, `document`, `research`, `competitor`, `metric`, `manual`, `ai_generated`, `other` |
| `LINK_TYPES` | `supports`, `contradicts`, `informs`, `weakens`, `validates`, `invalidates` |

---

## CRUD Operations

### Create Decision

```
POST /api/projects/[projectId]/decisions
```

**Request body** (validated by `createDecisionSchema`):

```json
{
  "title": "Rebuild checkout payment processing",
  "category": "product",
  "status": "draft",
  "problem_statement": "Enterprise customers report checkout reliability issues..."
}
```

Required: `title` (3-200 chars), `problem_statement` (10-5000 chars).
Optional: `category` (defaults to `"other"`), `status` (defaults to `"draft"`), `context_summary`, `confidence_score`, `selected_option_id`.

**Response** (201):
```json
{ "decision": { "id": "uuid", "title": "...", ... } }
```

### Update Decision

```
PATCH /api/projects/[projectId]/decisions/[decisionId]
```

Body uses `updateDecisionSchema` — all fields from `createDecisionSchema` but partial (all optional).

### Delete Decision

```
DELETE /api/projects/[projectId]/decisions/[decisionId]
```

Cascades through the service layer, deleting all child records (options, assumptions, evidence links, recommendations).

### List / Get

Standard JSON responses: `{ "decisions": [...] }` or `{ "decision": {...} }`.

---

## Ownership & Security

The service layer (`src/lib/decisions/service.ts`) enforces ownership on every operation:

```typescript
// Every service function requires this context
{ userId: user.id, projectId: params.projectId }
```

1. Verify project exists AND belongs to user (Supabase query with `user_id` filter)
2. For single-decision operations, verify the decision belongs to the project
3. RLS policies provide database-level backup

---

## AI Analysis (`/analyze`)

The analyze endpoint delegates to `analyzeDecision()` in `src/lib/decisions/decision-review-service.ts`. This is the most complex AI workflow in the system — see [DECISION_REVIEW_FLOW.md](../architecture/DECISION_REVIEW_FLOW.md) for the full 10+ phase pipeline.

### What it produces

| Table | Records | Content |
|---|---|---|
| `product_decision_options` | 3-4 | Options with title, description, pros, cons, effort, reversibility, confidence |
| `product_assumptions` | 1-15 | Assumptions with type, risk level, evidence status, validation method |
| `product_evidence` | 0-N | Evidence records from RAG retrieval with relevance scores |
| `product_decision_evidence_links` | 0-N | Links between evidence and the decision |
| `product_decision_recommendations` | 1 | Recommendation with reasoning, next steps, confidence score |

### AI Output Validation Pipeline

```
OpenAI returns JSON string
  → JSON.parse()
  → normalizeDecisionReviewOutput()     ← src/lib/decisions/review-normalize.ts
      • snake_case keys → camelCase     (confidence_score → confidenceScore)
      • string numbers → numbers        ("65" → 65)
      • enum alias mapping              ("legal" → "business", "financial" → "pricing")
      • null arrays → empty arrays      (null → [])
  → decisionReviewOutputSchema.safeParse()  ← src/lib/decisions/review-schemas.ts
      • Zod validation with strict types
  → If invalid: build correction prompt with Zod errors → retry once (max 1 retry)
  → If still invalid: throw error
  → sanitizeCitationIds()               ← remove references to evidence not actually provided
  → Save to database
```

### Assumption Type Normalization

OpenAI frequently returns assumption types not in the allowed enum. The normalization layer maps ~30 aliases to valid values:

```
"legal" → "business"       "financial" → "pricing"
"adoption" → "growth"      "security" → "technical"
"customer" → "user"        "design" → "ux"
(unmapped values) → "other"
```

Full alias map in `src/lib/decisions/review-normalize.ts` (lines 20-58).

### Insert-Before-Delete Save Strategy

New AI records are inserted first. Only after the critical recommendation insert succeeds are old records deleted. If the insert fails, old data remains intact.

Old records are identified by `generated_by = "decision_review_v1"` (or `NULL` for legacy rows created before the column was added).

### Response

The route returns the full result from `analyzeDecision()`:

```json
{
  "recommendation": { ... },
  "options": [{ ... }],
  "assumptions": [{ ... }],
  "evidence": [{ ... }],
  "confidenceScore": 72
}
```

### Error handling

| Error | Status | Cause |
|---|---|---|
| `"Unauthorized"` | 401 | No session |
| `"Invalid parameters."` | 400 | projectId or decisionId not valid UUIDs |
| Rate limit | 429 | Heavy tier (5/15min) exceeded |
| `"...not found"` / `"access denied"` | 404 | Decision doesn't exist or isn't owned by user |
| `"...not configured"` | 503 | `OPENAI_API_KEY` missing |
| `"Could not analyze decision..."` | 502 | OpenAI failure or validation failure after retry |

---

## Legacy vs Active Fields

Some database columns are written by the AI but intentionally hidden from the UI:

| Field | Table | Status | Why hidden |
|---|---|---|---|
| `supporting_evidence` | `product_decision_recommendations` | Stored, not rendered | Overlaps with Evidence section |
| `alternatives` | `product_decision_recommendations` | Stored, not rendered | Recommendation text covers this |
| `risks` (on recommendation) | `product_decision_recommendations` | Stored, not rendered | Overlaps with option-level risk data |
| `expected_impact` | `product_decision_options` | Stored, not rendered | Often vague |
| `next_steps` | `product_decision_recommendations` | **Dead column** | Never written by Decision Review; `next_validation_steps` is used instead |
| `type` + `assumption_type` | `product_assumptions` | **Duplicate** | Both store the same value; `assumption_type` is canonical |

See [TECHNICAL_DEBT_AND_FUTURE_IMPROVEMENTS.md](../roadmap/TECHNICAL_DEBT_AND_FUTURE_IMPROVEMENTS.md) for cleanup plan.

---

## Key Files

| File | Role |
|---|---|
| `src/app/api/projects/[projectId]/decisions/route.ts` | List + Create route handlers |
| `src/app/api/projects/[projectId]/decisions/[decisionId]/route.ts` | Get + Update + Delete route handlers |
| `src/app/api/projects/[projectId]/decisions/[decisionId]/analyze/route.ts` | AI analysis route handler (thin) |
| `src/lib/decisions/service.ts` | CRUD service layer with ownership checks |
| `src/lib/decisions/schemas.ts` | Zod validation schemas for all entities |
| `src/lib/decisions/constants.ts` | Enum definitions (single source of truth) |
| `src/lib/decisions/decision-review-service.ts` | AI analysis orchestrator |
| `src/lib/decisions/review-schemas.ts` | Zod schema for AI output validation |
| `src/lib/decisions/review-normalize.ts` | AI output normalization (enum aliases, key mapping) |

---

## Implementation Caveats

1. **No transactions.** Insert-before-delete is not wrapped in a database transaction. Supabase JS client doesn't support multi-statement transactions. Partial failures are possible but unlikely — and the old data is preserved if they occur.

2. **Re-analysis replaces everything.** There is no versioning or history of previous analyses. Running analyze again deletes all AI-generated records and creates new ones.

3. **`generated_by = NULL` legacy path.** Records created before the `generated_by` column was added have `NULL`. The cleanup logic treats `NULL` the same as `"decision_review_v1"`. This must change before user-editable outputs are added. See tech debt doc.

4. **`product_decision_agent_reviews` table is unused.** It exists in the schema but no code writes to it. It was reserved for future multi-agent Decision Review (distinct from the existing `/api/ai/multi-agent-review` which stores results differently).

5. **No streaming.** The analyze endpoint is synchronous — the client waits for the full result. OpenAI calls can take 5-15 seconds. The UI shows a loading spinner during this time.

