# Future Architecture Directions

Realistic engineering evolution paths for ProductMind, grounded in the current implementation. Every section documents the current state, what is architecturally prepared, and what realistic next steps look like.

**Maturity labels used throughout:**
- ✅ **Implemented** — running in production
- 🔧 **Architecture prepared** — abstractions/configs exist, not wired at runtime
- 💡 **Feasible next step** — natural evolution from current code
- 🔮 **Exploratory** — conceptual, not planned, no code foundation

---

## 1. RAG Everywhere Evolution

### Current state

The RAG pipeline is fully implemented:

```
Feedback Document → Chunker (~500 tokens) → text-embedding-3-small (1536d) → document_chunks (pgvector)
Query → Embedding → cosine similarity → threshold degradation (0.3→0.2→0.0) → quality gate (MIN_PROMPT_SIMILARITY=0.2) → lexical guard → project-scoped results
```

Key infrastructure:
- ✅ `src/lib/rag/` — chunking, embedding, vector search, context builder
- ✅ `src/lib/evidence/` — intent-based retrieval, citation formatting, typed evidence candidates
- ✅ `src/lib/evidence/intent-config.ts` — per-intent retrieval configs (limits, thresholds, query prefixes, preferred source types)
- ✅ Quality gates: similarity threshold, lexical guard, overlap deduplication
- ✅ `RetrievalQualityStats` — diagnostics for every retrieval call

### Which features use RAG at runtime

| Feature | Route | Retrieval method | Status |
|---|---|---|---|
| AI Chat (per project) | `/api/ai/chat` | `retrieveRelevantContext()` from `src/lib/rag` | ✅ Implemented |
| AI Roadmap | `/api/ai/roadmap` | `retrieveRelevantContext()` from `src/lib/rag` | ✅ Implemented |
| Multi-Agent Review | `/api/ai/multi-agent-review` | `retrieveRelevantContext()` from `src/lib/rag` (optional, gated by `includeRag` flag) | ✅ Implemented |
| Decision Review | `/api/projects/[id]/decisions/[id]/analyze` | `retrieveEvidence()` from `src/lib/evidence` (full evidence layer with citations) | ✅ Implemented |

### Which features do NOT use RAG at runtime (but have intent configs)

| Feature | Route | Intent config exists? | Why not wired |
|---|---|---|---|
| PRD Generator | `/api/ai/prd` | 🔧 `prd_generation` config in `intent-config.ts` | Route uses `generateCompletionWithUsage()` directly with project metadata from DB. No retrieval call. |
| Competitive Analysis | `/api/ai/competitive-analysis` | 🔧 `competitive_analysis` config in `intent-config.ts` | Same pattern — DB context only. |
| AI Insights | `/api/ai/insights` | ❌ No config (but `risk_analysis` and `feedback_synthesis` intents exist) | Pure generation from project metadata. |
| Feature Prioritizer | `/api/ai/prioritize` | ❌ No config | Uses `generateCompletionWithUsage()` with feature list + project metadata. |
| Score Features | `/api/ai/score-features` | ❌ No config | Uses OpenAI directly with feature descriptions. |

### Why this matters

Features without RAG generate outputs based solely on project metadata fields (name, description, target_users, market, business_model, goals) and optionally structured context (8 fields from `project_context` table). They cannot reference specific feedback, research quotes, or uploaded evidence.

Adding RAG to these features would:
- Ground PRDs in actual user feedback instead of inferred user needs
- Make competitive analysis aware of uploaded competitor research
- Let insights reference specific pain points from interviews
- Allow feature prioritization to cite feedback frequency

### Feasible next steps

**PRD → retrieval-backed generation** 💡
- Wire `retrieveEvidence({ intent: "prd_generation", ... })` into `/api/ai/prd/route.ts`
- The intent config already exists with `minSimilarity: 0.68`, `queryPrefix: "product requirements goals constraints user needs"`, and preferred source types
- Inject retrieved context into the PRD system prompt alongside project metadata
- Expected: PRDs that reference actual customer quotes and research findings
- Complexity: Low — ~30 lines of code to add retrieval call and context injection
- Risk: Longer prompts increase token cost; retrieved chunks may not always be relevant to PRD scope

**Competitive Analysis → project-aware analysis** 💡
- Wire `retrieveEvidence({ intent: "competitive_analysis", ... })` into the route
- Config exists with `queryPrefix: "competitors market landscape positioning"` and preferred source types including `"competitor"`
- Expected: Analysis that references uploaded competitor research notes
- Complexity: Low — same pattern as PRD

**Insights → hybrid retrieval** 💡
- No dedicated intent config exists, but `risk_analysis` and `feedback_synthesis` intents could be reused or a new `insights` intent created
- Could retrieve pain points and feedback themes to ground insight generation
- Complexity: Medium — need to decide which retrieval intent to use and how to weight retrieved vs inferred insights

**Feature Prioritization → evidence-aware scoring** 🔮
- Would require matching feature descriptions against feedback chunks to find supporting/contradicting evidence
- More complex because it needs per-feature retrieval, not per-project
- Complexity: High — fundamentally different retrieval pattern (per-feature instead of per-request)

---

## 2. Citations & Evidence UX

### Current state

| Component | Status |
|---|---|
| Evidence retrieval via pgvector | ✅ Implemented |
| `EvidenceCandidate` typed results with similarity scores | ✅ Implemented |
| `EvidenceCitation` types with citation IDs (`[1]`, `[2]`) | ✅ Implemented |
| `createEvidenceCitations()` — numbered citation generation | ✅ Implemented |
| `formatEvidenceForPrompt()` — context injection into AI prompts | ✅ Implemented |
| Citation ID validation against retrieved evidence | ✅ Implemented (in decision review service) |
| Evidence cards in Decision Review UI | ✅ Implemented — shows source type, content, linked evidence |
| Inline citation rendering in AI output text | ❌ Not implemented |
| Citation click-through / tooltips | ❌ Not implemented |
| Evidence confidence indicators | ❌ Not implemented |

### Architecture prepared but not in UX

The evidence layer generates numbered citations (`[1]`, `[2]`) that are injected into AI prompts. The AI model may reference these in its output text (e.g., "Based on user feedback [1], allergen filtering is a priority"). However:

- The UI renders AI output text as plain markdown
- Citation IDs like `[1]` appear as literal text, not as interactive references
- No mapping exists between the `[1]` in output text and the corresponding evidence chunk

### Feasible next steps

**Lightweight citation badges** 💡
- Parse AI output text for `[N]` patterns
- Replace with styled badges that link to the corresponding evidence card
- Data is already available — `EvidenceCitation` objects have `citationId`, `chunkId`, `snippet`, `similarityScore`
- Complexity: Medium — requires a custom markdown renderer or post-processor
- Risk: AI doesn't always use citation IDs consistently; need graceful fallback for unmatched IDs

**Evidence confidence indicators** 💡
- Display similarity score as a confidence badge on evidence cards (e.g., "92% match", "71% match")
- Data already exists in `EvidenceCandidate.similarityScore`
- Complexity: Low — pure UI change
- UX benefit: Helps users gauge how relevant the retrieved evidence is

**Expandable evidence panels** 💡
- Show full chunk content in an expandable drawer/panel instead of truncated cards
- Include source document name, chunk position, retrieval metadata
- Complexity: Low — UI-only

**Evidence traceability for non-decision features** 🔮
- Once RAG is wired into PRD/competitive analysis/insights (see Section 1), surface retrieved evidence alongside those outputs
- Requires storing retrieval results per generation, not just per decision
- Complexity: Medium — needs a generic `generation_evidence` junction table

---

## 3. Editable AI Workflows

### Current state

| Aspect | Status |
|---|---|
| AI outputs are generated and stored as structured JSON | ✅ Implemented |
| Regeneration replaces all AI-generated content | ✅ Implemented |
| `generated_by` field distinguishes AI vs manual records | ✅ Implemented |
| Insert-before-delete prevents data loss on re-analysis | ✅ Implemented |
| In-app editing of individual AI-generated fields | ❌ Not implemented |
| Partial regeneration ("regenerate just this section") | ❌ Not implemented |
| Generation history / versioning | ❌ Not implemented |
| Draft vs approved states | ❌ Not implemented |

### Required data model evolution

The `generated_by` marker is the foundation. Currently:
- AI-generated records: `generated_by = "decision_review_v1"` (or `NULL` for legacy)
- Manual records: not yet possible (no creation UI)

For editable outputs:
1. Manual edits must set `generated_by = "manual"` — never `NULL`
2. Cleanup logic in `deleteOldRecords()` must stop deleting `NULL` rows (currently deletes them as legacy)
3. Re-analysis must only delete `generated_by = "decision_review_v1"` rows, preserving manual edits
4. A confirmation dialog is needed: "Re-analyzing will replace AI analysis. Manual edits will be preserved."

### Feasible next steps

**Field-level editing for Decision Review** 💡
- Add PATCH endpoints for `product_decision_options`, `product_assumptions`, `product_decision_recommendations`
- Set `generated_by = "manual"` on edited rows
- Protected from re-analysis cleanup
- Complexity: Medium — needs new API routes, edit UI, optimistic updates
- Files: `decision-review-service.ts` (cleanup logic), new PATCH routes, `decision-detail-client.tsx` (edit controls)

**Partial regeneration** 🔮
- "Regenerate options" without touching assumptions or recommendations
- Requires splitting the single `analyzeDecision()` call into subsection generators
- Significant prompt engineering: each section needs standalone context
- Complexity: High — architectural change to the generation pipeline

**Generation history** 🔮
- Snapshot previous AI outputs before regeneration
- Could use a `decision_review_runs` table with timestamped snapshots
- Enables "view previous analysis" and diff comparison
- Complexity: Medium — mostly storage and UI

---

## 4. Multi-Agent System Expansion

### Current state

| Aspect | Status |
|---|---|
| 4 fixed personas: PM, CTO, UX Researcher, Growth Marketer | ✅ Implemented |
| Individual persona evaluations | ✅ Implemented |
| Consensus summary with agreements/disagreements/blind spots | ✅ Implemented |
| Sequential execution (persona 1 → 2 → 3 → 4 → consensus) | ✅ Implemented |
| Zod validation per persona response | ✅ Implemented |
| Optional RAG context (`includeRag` flag) | ✅ Implemented |
| Optional insights integration (`includeInsights` flag) | ✅ Implemented |
| Persistence in `multi_agent_reviews` table | ✅ Implemented |
| Configurable persona set | ❌ Not implemented |
| Parallel execution | ❌ Not implemented |
| Weighted consensus | ❌ Not implemented |

### Token/cost reality

Each multi-agent review makes **5 sequential OpenAI calls** (4 personas + 1 consensus). This is the most expensive feature:
- ~4x token usage compared to single-call features
- Sequential execution means ~4x latency
- Classified as "heavy" rate limit tier (5 per 15 minutes)

### Feasible next steps

**Parallel persona execution** 💡
- Use `Promise.all()` to run 4 persona calls concurrently
- Consensus call still sequential (needs all 4 results)
- Expected: ~75% latency reduction for the persona phase
- Complexity: Low — change sequential loop to parallel
- Risk: OpenAI rate limits may throttle concurrent requests; need error handling per persona

**Configurable persona selection** 💡
- Let users choose which personas to include (e.g., skip Growth Marketer for technical decisions)
- `PERSONA_PROMPTS` is already a `Record<AgentRole, string>` — easy to filter
- Reduces cost proportionally
- Complexity: Low — UI checkboxes + filter the persona list before execution

**Disagreement visualization** 💡
- Parse consensus response for explicit disagreements between personas
- Highlight conflicting recommendations across perspectives
- Current consensus text already covers this narratively; structured extraction would make it more actionable
- Complexity: Medium — requires extending the consensus prompt to produce structured disagreement data

**Custom personas** 🔮
- User-defined roles with custom prompts (e.g., "Legal Counsel", "Data Engineer")
- Would need a `custom_personas` table and prompt editor UI
- Complexity: High — prompt engineering UI, quality assurance for custom prompts

**Weighted consensus** 🔮
- Assign importance weights to personas based on decision type
- Technical decisions weight CTO higher; growth decisions weight Growth Marketer higher
- Complexity: Medium — weight injection into consensus prompt

---

## 5. AI Governance & Reliability Layer

### Current strengths

| Mechanism | Implementation | Status |
|---|---|---|
| Zod schema validation | All structured AI outputs parsed through Zod before persistence | ✅ Implemented |
| Normalization layer | `review-normalize.ts` handles snake_case→camelCase, string→number coercion, alias mapping | ✅ Implemented |
| Insert-before-delete | New results written before old ones deleted | ✅ Implemented |
| `generated_by` ownership | AI-generated vs manual record distinction | ✅ Implemented |
| Structured retry | Invalid JSON triggers one retry with Zod error feedback in prompt | ✅ Implemented |
| Citation ID validation | Citation IDs in AI output validated against actual retrieved evidence | ✅ Implemented |
| Usage telemetry | Every AI call logged with model, tokens, cost, latency, feature, status | ✅ Implemented |
| Project isolation | RLS + project_id filter in retrieval + prompt-level scoping | ✅ Implemented |
| Mock mode | Deterministic mock generators for all AI features | ✅ Implemented |

### What is NOT tracked

| Gap | Why it matters |
|---|---|
| Generation provenance | No link between a stored AI output and the exact prompt/context that produced it |
| Retrieval quality metrics | `RetrievalQualityStats` logged to console in dev, not persisted |
| Validation failure rates | Zod failures logged to console, not aggregated |
| Retry frequency | Retry attempts not tracked in `ai_usage` |
| Hallucination detection | No automated check for claims without supporting evidence |
| Prompt versioning | `PROMPT_VERSION = "v1.1"` exists but not used for A/B testing or rollback |

### Feasible next steps

**Persist retrieval quality stats** 💡
- Store `RetrievalQualityStats` in `ai_usage.metadata` alongside token counts
- Already available as a return value — just needs to be passed to `trackAIUsage()`
- Enables: "what % of AI calls had relevant context?" analysis
- Complexity: Low — add one field to the tracking call

**Validation failure tracking** 💡
- Track Zod validation failures in `ai_usage` with `status: "validation_failed"`
- Current implementation logs to console and retries; success/failure tracking exists but validation-specific metrics don't
- Complexity: Low

**Generation provenance** 💡
- Store prompt hash and retrieval snapshot alongside AI outputs
- Enables: "what context produced this output?" debugging
- Complexity: Medium — needs additional storage column and serialization

**Retrieval quality dashboard** 🔮
- Aggregate retrieval stats over time: average similarity scores, discard rates, lexical guard trigger rates
- Complexity: Medium — needs aggregation queries and UI

**Prompt A/B testing** 🔮
- Route % of requests to alternative prompts, track output quality metrics
- Current `PROMPT_VERSION` field provides the hook but no comparison infrastructure exists
- Complexity: High — needs evaluation criteria, statistical comparison, version management

---

## 6. Product Intelligence Direction

### Current state

ProductMind features are **independent generation workflows**. Each tool produces a standalone output from project context:

```
Project Context → [PRD Generator] → PRD
Project Context → [Feature Prioritizer] → Scored features
Project Context → [Roadmap] → Now/Next/Later plan
Project Context → [Decision Review] → Options + recommendation
```

There is no cross-feature awareness. The PRD doesn't know what decisions have been made. The roadmap doesn't know what the PRD recommended. Insights don't reference roadmap priorities.

### What is partially prepared

- **Structured project context** (`project_context` table with 8 fields) provides shared context across features ✅
- **Evidence layer** provides shared retrieval infrastructure ✅
- **Usage telemetry** tracks which features have been used per project ✅
- **`decisions` table** stores generated documents that could be cross-referenced 🔧

### Possible directions (all exploratory 🔮)

**Roadmap aware of decisions**
- When generating a roadmap, include recent decision outcomes as context
- "Decision X was accepted with confidence 85% — factor this into roadmap priorities"
- Requires: fetching from `product_decisions` and `product_decision_recommendations` in roadmap route
- Complexity: Medium

**PRD aware of feedback themes**
- If RAG is wired into PRD (see Section 1), PRDs could automatically reference common feedback themes
- "Users reported X pain point (3 mentions across feedback) — address in requirements"
- Complexity: Medium (dependent on Section 1)

**Insights aware of all prior outputs**
- Generate insights that reference existing PRD, roadmap, and decision outputs
- "Your roadmap prioritizes feature X, but no decision review has evaluated its risks"
- Complexity: High — needs to load and summarize multiple output types

**Persistent project memory** 🔮
- Store key conclusions from each AI generation as lightweight facts in a `project_memory` table
- Future generations reference accumulated knowledge instead of regenerating from scratch
- Risk: Memory accumulation without curation leads to stale/contradictory facts
- Complexity: High — needs memory management, conflict resolution, staleness detection

**Important caveat**: These are conceptual directions. None are architecturally prepared. Cross-feature intelligence requires careful design to avoid circular dependencies, token budget explosion, and incoherent context assembly.

---

## 7. Infrastructure & Platform Maturity

### Current strengths

| Capability | Implementation | Status |
|---|---|---|
| SSE streaming | Chat uses `ReadableStream` with SSE for real-time token delivery | ✅ Implemented |
| Rate limiting | In-memory sliding window, standard/heavy tiers, admin bypass | ✅ Implemented |
| Usage telemetry | `ai_usage` table with tokens, cost, model, latency, feature, status | ✅ Implemented |
| Mock mode | Three flags enable full local development without external services | ✅ Implemented |
| Production guards | Mock flags in production throw fatal errors at startup | ✅ Implemented |
| Auth middleware | Session refresh + route protection on all `/dashboard/*` routes | ✅ Implemented |

### Known infrastructure gaps

| Gap | Current state | Impact |
|---|---|---|
| Rate limiting persistence | In-memory, resets on cold start | Limits are unreliable on serverless; acceptable for MVP |
| Background jobs | All AI runs synchronously in request lifecycle | Long-running features (multi-agent: 5 sequential calls) risk timeouts |
| Error tracking | Console logs + Vercel logs only | Silent failures in AI workflows |
| Staging environment | None — dev deploys directly to production | No pre-production validation |
| Caching | No retrieval or generation caching | Repeated identical queries re-embed and re-search |

### Feasible next steps

**Redis-backed rate limiting** 💡
- Replace in-memory `Map` with Upstash Redis or Supabase DB counters
- Current `checkRateLimit()` function is already abstracted — swap the storage backend
- Code comment explicitly suggests `@upstash/ratelimit`
- Complexity: Low — the abstraction is designed for this swap

**Retrieval caching** 💡
- Cache embedding vectors for repeated queries (e.g., same chat message re-sent)
- Cache pgvector search results with short TTL
- Complexity: Medium — needs cache invalidation when documents are updated

**Async AI pipelines** 💡
- Move long-running operations (multi-agent review, roadmap generation) to background jobs
- Return a job ID immediately, poll for completion
- Could use Vercel background functions, Inngest, or Trigger.dev
- Complexity: High — needs job queue, status tracking, polling UI, error recovery

**Observability** 💡
- Add Sentry for error tracking
- Add structured logging (pino/winston) replacing `console.log`/`console.warn`
- Complexity: Low-Medium — standard integration work

**Latency tracking** 💡
- Already tracked: `latencyMs` in `ai_usage` metadata
- Not yet surfaced in UI or used for alerting
- Complexity: Low — query existing data

---

## 8. Product Positioning Evolution

### Current positioning reality

ProductMind is strongest as a **well-engineered applied AI workflow system** — not a magical autonomous AI platform.

The genuinely impressive engineering includes:

| Differentiator | Why it matters |
|---|---|
| **RAG pipeline with quality gates** | Not a toy "embed and search" — includes threshold degradation, lexical guard, overlap deduplication, per-intent tuning |
| **Multi-agent orchestration** | 4 independent AI personas with structured output validation + consensus synthesis |
| **Zod-validated AI outputs** | Every structured AI response is schema-validated before persistence — with automatic retry on failure |
| **Insert-before-delete safety** | Re-analysis never loses previous data — new results are written before old ones are removed |
| **Evidence layer abstraction** | Intent-based retrieval with configurable limits, thresholds, and source type preferences |
| **Project-scoped isolation at 3 levels** | Database RLS, retrieval `project_id` filter, prompt-level context scoping |
| **`generated_by` ownership tracking** | Clean separation of AI-generated vs manual content, enabling safe re-analysis |
| **SSE streaming chat** | Real token-by-token streaming with project-scoped RAG context |
| **Usage telemetry across all features** | Token counts, costs, latency, model, feature type — per-user, per-project |
| **Mock-first development** | Three independent flags enable full local development without any external service |

### What the product is NOT

It is important for positioning — especially in a portfolio context — to be honest about what the system does not do:

- It is not an autonomous agent system — all operations are user-initiated, single-shot
- It is not a real-time collaboration tool — single-user only
- It is not a production enterprise SaaS — MVP with in-memory rate limiting, no SLA
- It is not a document editor — AI outputs are view-only snapshots
- RAG is not universal — only 4 of 9 AI features use retrieval at runtime
- The multi-agent system is sequential, not parallel or autonomous

### Why honest sophistication wins

For a portfolio project, demonstrating:
- "I built a RAG pipeline with quality gates, lexical guard, and threshold degradation"
- "I implemented multi-agent AI orchestration with Zod-validated structured output and consensus synthesis"
- "I designed an insert-before-delete safety pattern for AI re-analysis"

is significantly more impressive than claiming:
- "AI-powered decision intelligence platform"
- "Autonomous multi-agent system"
- "Enterprise-grade AI operating system"

The former demonstrates engineering judgment. The latter demonstrates marketing inflation.

---

## Maturity Summary

| Area | Current | Next realistic step | Effort |
|---|---|---|---|
| RAG coverage | 4/10 features | Wire PRD + competitive analysis (configs exist) | Low |
| Citation UX | Prompt-level only | Confidence badges on evidence cards | Low |
| Editable outputs | View-only + regenerate | Field-level editing for decisions | Medium |
| Multi-agent | Sequential, 4 fixed personas | Parallel execution + persona selection | Low-Medium |
| AI governance | Zod + telemetry + safety patterns | Persist retrieval quality stats | Low |
| Product intelligence | Independent workflows | Roadmap-aware-of-decisions | Medium |
| Infrastructure | Streaming + in-memory rate limit | Redis rate limiting + Sentry | Low-Medium |
| Positioning | Applied AI workflow system | Maintain honest sophistication | Ongoing |

---

*Last updated: 2026-05-24*

