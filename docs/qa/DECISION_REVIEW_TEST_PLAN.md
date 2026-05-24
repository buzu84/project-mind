# Decision Review — Manual Test Plan

Manual test cases for the Decision Review AI analysis flow. Every step references actual UI labels and database columns.

---

## Prerequisites

### Environment

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-key>
OPENAI_API_KEY=<your-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
USE_MOCK_AUTH=true
NEXT_PUBLIC_USE_MOCK_AUTH=true
USE_REAL_AI=true
```

Set `USE_REAL_AI=false` for mock-only testing (skips OpenAI calls, returns deterministic output).

### Migrations

All migrations in `supabase/migrations/` must be applied, including:
- `20260504_decision_engine.sql` — creates `product_*` tables
- `20260505_decision_review_hardening.sql` — adds `generated_by` columns
- `20260520_decision_review_schema_alignment.sql` — adds `claim`, `source_id`, `relevance_score`, `type`, `evidence_status` columns

Verify `generated_by` columns exist:

```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE column_name = 'generated_by' AND table_schema = 'public' ORDER BY table_name;
```

Expected: 4 rows (`product_assumptions`, `product_decision_options`, `product_decision_recommendations`, `product_evidence`).

### Start the app

```bash
npm run dev
# → http://localhost:3000
```

---

## Test 1 — Happy Path (with evidence)

**Goal:** Analysis retrieves project feedback, generates structured output, saves correctly.

### Setup

1. Create a project named **"Orion Payments"**.
2. Go to **Feedback & Research** tab → click **Add Feedback**.
   - **Title:** `Enterprise Payment Survey Q1`
   - **Content:**
     ```
     The zephyr-checkout-widget received negative feedback from 18 of 25
     enterprise customers. Key complaints: (1) no multi-currency support,
     (2) settlement reports are PDF-only with no API export, and
     (3) transaction retry logic causes duplicate charges in 3% of cases.
     Customers rated checkout reliability at 2.1 out of 5.
     ```
   - **Source:** `Customer Interview` (select from dropdown)
3. Wait ~3 seconds for embedding ingestion.
4. Go to **Decisions** tab → click **New Decision**.
   - **Title:** `Rebuild checkout payment processing`
   - **Category:** `product`
   - **Problem Statement:** `Enterprise customers report checkout reliability issues including duplicate charges, missing multi-currency support, and no API access to settlement reports. We need to decide whether to rebuild or patch the existing zephyr-checkout-widget.`
5. Save the decision.

### Execute

6. On the decisions list, click **Analyze** on "Rebuild checkout payment processing".
7. Wait for the loading state ("Analyzing…") to complete.
8. Click the decision title to open the detail page.

### Verify — UI

- [ ] Loading text "Analyzing…" appeared during processing.
- [ ] **💡 Recommendation** section visible with recommendation text mentioning checkout/payment issues.
- [ ] **"Next Steps"** subheading visible under recommendation (rendered from `next_validation_steps` column).
- [ ] **Confidence score** displayed (expect 40–80 range when evidence is found).
- [ ] **Decision Options** section shows 3–4 option cards, each with title, description, pros, cons.
- [ ] **Assumptions** section shows assumption cards with type badges and risk levels.
- [ ] **Evidence** section shows at least 1 evidence card referencing "Enterprise Payment Survey Q1" or containing `zephyr-checkout-widget`.

### Verify — Database

```sql
-- Replace <DID> with the decision UUID from the URL
-- e.g., /projects/xxx/decisions/<DID>

-- Options (expect 3-4 rows)
SELECT id, title, effort_estimate, confidence_score, generated_by
FROM product_decision_options WHERE decision_id = '<DID>' ORDER BY created_at;

-- Assumptions (expect 1-15 rows)
SELECT id, LEFT(statement, 60), assumption_type, risk_level, evidence_status, generated_by
FROM product_assumptions WHERE decision_id = '<DID>' ORDER BY created_at;

-- Recommendation (expect exactly 1 row)
SELECT id, LEFT(recommendation, 80), confidence_score, generated_by,
       next_validation_steps, next_steps
FROM product_decision_recommendations WHERE decision_id = '<DID>';

-- Evidence + links
SELECT pe.id, pe.title, pe.source_type, pe.relevance_score, pe.generated_by, pdel.link_type
FROM product_decision_evidence_links pdel
JOIN product_evidence pe ON pe.id = pdel.evidence_id
WHERE pdel.decision_id = '<DID>';

-- Decision confidence updated
SELECT id, title, confidence_score FROM product_decisions WHERE id = '<DID>';
```

Checklist:
- [ ] All AI-generated records have `generated_by = 'decision_review_v1'`.
- [ ] `confidence_score` on `product_decisions` matches the recommendation's confidence.
- [ ] `next_validation_steps` contains an array of strings (rendered as "Next Steps" in UI).
- [ ] `next_steps` is `NULL` or empty — this is a **dead column**, never written by Decision Review. This is expected, not a bug.
- [ ] `product_assumptions.result` is `NULL` — intended for future human validation, not populated by AI.
- [ ] `product_assumptions` has both `type` and `assumption_type` with the same value — this is a known duplicate, not a bug.

### Verify — AI Usage

```sql
SELECT feature, model, status, prompt_tokens, completion_tokens, estimated_cost,
       metadata->>'decisionId' AS decision_id,
       metadata->>'evidenceCount' AS evidence_count,
       metadata->>'retryCount' AS retry_count,
       metadata->>'promptVersion' AS prompt_version
FROM ai_usage WHERE feature = 'decision_review' ORDER BY created_at DESC LIMIT 3;
```

- [ ] 1 row with `status = 'success'`, `feature = 'decision_review'`.
- [ ] `prompt_tokens > 0` and `completion_tokens > 0` (real AI mode).
- [ ] `prompt_version = 'v1.1'`.
- [ ] `retry_count = '0'` (clean first-pass success).

**Related telemetry rows** (may also appear from the same analysis):
- `feature = 'query_embedding'` — embedding the decision text for RAG search. Has token usage.
- `feature = 'rag_search'` — database retrieval telemetry. `prompt_tokens = 0, completion_tokens = 0`. This is expected — it's a DB lookup, not an LLM call.

### Verify — Dev Logs

| Log prefix | Expected |
|---|---|
| `[decision-review] Evidence stats:` | `retrieved` ≥ 0, `used` ≥ 0, `hasRelevantEvidence: true` if feedback ingested |
| `[rag] Vector search OK:` | `rpcResults` ≥ 1, `projectId` matches |

---

## Test 2 — No Relevant Evidence

**Goal:** Analysis succeeds but acknowledges limited evidence and produces lower confidence.

### Execute

1. In **"Orion Payments"**, create a new decision:
   - **Title:** `Adopt GraphQL for internal microservices`
   - **Problem Statement:** `Our internal services use REST APIs with inconsistent schemas. Engineering wants to standardize on GraphQL for inter-service communication.`
2. Click **Analyze**.
3. Open the detail page.

### Verify

- [ ] Analysis generated successfully (not an error).
- [ ] **Confidence score is lower** than Test 1 (expect 20–50).
- [ ] **Evidence** section is empty (0 cards).
- [ ] No mention of `zephyr-checkout-widget` or payment topics in the analysis.
- [ ] Options still generated (3–4), but may have `unknown` effort estimates.

```sql
SELECT COUNT(*) FROM product_decision_evidence_links WHERE decision_id = '<GRAPHQL_DID>';
-- Expected: 0

SELECT confidence_score FROM product_decisions WHERE id = '<GRAPHQL_DID>';
-- Expected: lower than the checkout decision
```

---

## Test 3 — Re-Analysis (No Duplicates)

**Goal:** Running analysis again replaces previous AI-generated records without creating duplicates.

### Execute

1. Use the checkout decision from Test 1 (already analyzed).
2. Record current counts:

```sql
SELECT 'options' AS type, COUNT(*) FROM product_decision_options WHERE decision_id = '<DID>'
UNION ALL SELECT 'assumptions', COUNT(*) FROM product_assumptions WHERE decision_id = '<DID>'
UNION ALL SELECT 'recommendations', COUNT(*) FROM product_decision_recommendations WHERE decision_id = '<DID>'
UNION ALL SELECT 'evidence_links', COUNT(*) FROM product_decision_evidence_links WHERE decision_id = '<DID>';
```

3. On the detail page, click **Re-Analyze**.
4. Wait for completion.
5. Run the same count query again.

### Verify

- [ ] **Options:** Same count (3–4), not doubled.
- [ ] **Assumptions:** Same or similar count, not doubled.
- [ ] **Recommendations:** Exactly 1.
- [ ] All records have `generated_by = 'decision_review_v1'`.
- [ ] `ai_usage` now has 2 rows for `decision_review` for this decision.

---

## Test 4 — Failure Safety (Insert-Before-Delete)

**Goal:** If re-analysis fails, previous results remain intact.

### Execute

1. Ensure the decision has been analyzed once (from Test 1 or 3).
2. Stop the dev server.
3. Change `.env.local`: `OPENAI_API_KEY=sk-invalid-key-for-testing-only`
4. Restart: `npm run dev`
5. Click **Re-Analyze** on the same decision.
6. Restore the real API key and restart.

### Verify

- [ ] UI shows an error message (toast or inline).
- [ ] **Previous analysis is still visible** — recommendation, options, assumptions all intact.
- [ ] Record counts in DB are unchanged from before the failed attempt.
- [ ] `ai_usage` has a row with `status = 'error'` for the failed attempt.

---

## Test 5 — Rate Limiting

**Goal:** Heavy rate limit tier (5 per 15 min) blocks the 6th request.

### Prerequisite

Ensure your user is **not** in `ADMIN_EMAILS` (admins bypass limits). Remove `ADMIN_EMAILS` from `.env.local` or set it to a different email.

### Execute

1. Click **Analyze** on any decision, 5 times (waiting for each to complete).
2. On the 6th click, check the response.

### Verify

- [ ] 6th request returns HTTP 429 (visible in browser Network tab).
- [ ] UI shows rate limit message.
- [ ] `ai_usage` has exactly 5 `decision_review` rows for this window (the blocked one is not tracked as `success`).

**Note:** In-memory rate limiting resets on server restart. If testing across restarts, the counter resets.

---

## Test 6 — Cross-Project Isolation

**Goal:** Decision analysis in Project A cannot use Project B's feedback.

### Setup

1. Create project **"Nebula CRM"**.
2. Add feedback to Nebula CRM:
   - **Title:** `CRM Onboarding Survey`
   - **Content:** `The quantum-pipeline-sync feature confused 90% of new users. NPS dropped to -15 after launch.`
   - **Source:** `Customer Interview`
3. Wait ~3 seconds for ingestion.

### Execute

4. Switch to **"Orion Payments"**.
5. Create decision: `Evaluate quantum-pipeline-sync integration`
6. Problem statement: `Should we integrate quantum-pipeline-sync into our payment workflow?`
7. Click **Analyze**.

### Verify

- [ ] Analysis completes.
- [ ] **No mention** of "NPS dropped to -15", "CRM", or Nebula CRM content.
- [ ] **Evidence** section is empty.

```sql
SELECT pe.project_id, pe.title FROM product_decision_evidence_links pdel
JOIN product_evidence pe ON pe.id = pdel.evidence_id
WHERE pdel.decision_id = '<QUANTUM_DID>';
-- Expected: 0 rows, or all rows have project_id = Orion Payments UUID
```

---

## What Not To Worry About

These are expected behaviors, **not bugs**:

| Observation | Explanation |
|---|---|
| `next_steps` column is `NULL` or `[]` in `product_decision_recommendations` | **Dead column** — never written by Decision Review. `next_validation_steps` is the active column, rendered as "Next Steps" in UI. |
| `product_assumptions.result` is always `NULL` | Intended for future human validation tracking. Not populated by AI. |
| `product_assumptions` has both `type` and `assumption_type` | Known duplicate from schema alignment migration. Both store the same value. |
| `rag_search` in `ai_usage` shows 0 tokens | Expected — this is DB retrieval telemetry, not an LLM call. |
| `query_embedding` in `ai_usage` shows token usage | Expected — this is the embedding API call for the search query. |
| `product_decision_agent_reviews` table is empty | Unused/reserved table. No code writes to it. |
| Some stored fields (`expected_impact`, `supporting_evidence`, `alternatives`, `risks` on recommendation) are not shown in UI | Intentionally hidden — they overlap with other UI sections. |
| `generated_by = NULL` on old records | Records created before the `generated_by` migration. The cleanup logic treats `NULL` same as `'decision_review_v1'`. |
| Assumption type might differ between runs | AI output is non-deterministic; normalization maps ~30 aliases (e.g., "legal"→"business") to 8 valid types. |

---

## Pass/Fail Checklist

| # | Test | Key Assertion | Pass? |
|---|---|---|---|
| 1a | Happy path — UI | Recommendation, 3-4 options, assumptions, evidence visible | ☐ |
| 1b | Happy path — DB | All records have `generated_by = 'decision_review_v1'` | ☐ |
| 1c | Happy path — Evidence | At least 1 evidence card references project feedback | ☐ |
| 1d | Happy path — Usage | `ai_usage` row with `decision_review`, `status = 'success'` | ☐ |
| 2a | No evidence — UI | Analysis generated, lower confidence, empty evidence section | ☐ |
| 2b | No evidence — DB | 0 evidence links | ☐ |
| 3 | Re-analysis | No duplicate records, exactly 1 recommendation | ☐ |
| 4a | Failure safety — UI | Error shown, previous analysis intact | ☐ |
| 4b | Failure safety — DB | Old records unchanged | ☐ |
| 5 | Rate limit | 6th request returns 429 | ☐ |
| 6 | Cross-project | No Nebula CRM content in Orion analysis | ☐ |
