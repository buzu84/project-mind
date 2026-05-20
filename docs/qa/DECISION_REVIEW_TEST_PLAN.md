# Decision Review AI v1 — Manual Test Plan

> **Date:** 2026-05-05
> **Scope:** Decision Review analyze flow, evidence retrieval, save safety, rate limiting, cross-project isolation, citation validation.

---

## 1. Pre-Test Setup

### Required env vars (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-key>
OPENAI_API_KEY=<your-key>
USE_MOCK_AUTH=true
USE_REAL_AI=true       # set to false for mock-only testing
NODE_ENV=development   # ensures dev logs appear
```

### Required migration

Run in **Supabase SQL Editor**:

```sql
-- From: supabase/migrations/20260505_decision_review_hardening.sql
alter table product_decision_options add column if not exists generated_by text default null;
alter table product_assumptions add column if not exists generated_by text default null;
alter table product_evidence add column if not exists generated_by text default null;
alter table product_decision_recommendations add column if not exists generated_by text default null;

create index if not exists idx_product_evidence_generated_by on product_evidence (generated_by) where generated_by is not null;
create index if not exists idx_product_assumptions_generated_by on product_assumptions (generated_by) where generated_by is not null;
create index if not exists idx_product_decision_options_generated_by on product_decision_options (generated_by) where generated_by is not null;
```

### Verify columns exist

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name in ('product_decision_options','product_assumptions','product_evidence','product_decision_recommendations')
  and column_name = 'generated_by';
```

**Expected:** 4 rows, all `text`, default `null`.

### Verify app is ready

```bash
cd /Users/u756013/Work/project-mind
npx tsc --noEmit  # no errors
npm run dev        # server starts on localhost:3000
```

---

## 2. Happy Path — Relevant Evidence

**Goal:** Decision Review retrieves project feedback and generates a complete analysis.

### Setup

1. Open app → create project **"Orion Payments"**.
2. Go to **Feedback** tab → **Add Feedback**:
   - **Title:** `Enterprise Payment Survey Q1`
   - **Content:**
     ```
     The zephyr-checkout-widget received negative feedback from 18 of 25
     enterprise customers. Key complaints: (1) no multi-currency support,
     (2) settlement reports are PDF-only with no API export, and
     (3) transaction retry logic causes duplicate charges in 3% of cases.
     Customers rated checkout reliability at 2.1 out of 5.
     ```
   - **Source:** `user_research`
3. Wait 3 seconds for embedding ingestion.
4. Go to **Decisions** tab → **New Decision**:
   - **Title:** `Rebuild checkout payment processing`
   - **Category:** `product`
   - **Problem Statement:** `Enterprise customers report checkout reliability issues including duplicate charges, missing multi-currency support, and no API access to settlement reports. We need to decide whether to rebuild or patch the existing zephyr-checkout-widget.`
5. Click **Save**.

### Execute

6. In the decisions list, click the **Analyze** button on "Rebuild checkout payment processing".
7. Wait for loading to finish.
8. Click the decision title to open the **detail page**.

### Verify — UI

- [ ] Loading spinner / "Analyzing…" text appeared while processing.
- [ ] **Recommendation** card visible with blue background.
- [ ] Recommendation mentions checkout/payment issues, not fabricated topics.
- [ ] **Confidence score** displayed (expect 40–80 range if evidence found).
- [ ] **3–4 Decision Options** cards displayed, each with pros/cons.
- [ ] **Assumptions** section with risk levels and evidence status.
- [ ] **Evidence** section with at least 1 evidence card (if feedback was retrieved).
- [ ] Evidence card shows `"Enterprise Payment Survey Q1"` as title or contains `zephyr-checkout-widget` text.

### Verify — Supabase

```sql
-- Replace <DECISION_ID> with the actual UUID from the URL bar
-- e.g. /projects/xxx/decisions/<DECISION_ID>

-- Check options
select id, title, effort_estimate, confidence_score, generated_by
from product_decision_options
where decision_id = '<DECISION_ID>'
order by created_at;
```
- [ ] 3–4 rows.
- [ ] All have `generated_by = 'decision_review_v1'`.

```sql
-- Check assumptions
select id, statement, type, risk_level, evidence_status, generated_by
from product_assumptions
where decision_id = '<DECISION_ID>'
order by created_at;
```
- [ ] ≥ 1 row.
- [ ] All have `generated_by = 'decision_review_v1'`.

```sql
-- Check recommendation
select id, left(recommendation, 80), confidence_score, generated_by
from product_decision_recommendations
where decision_id = '<DECISION_ID>';
```
- [ ] 1 row.
- [ ] `generated_by = 'decision_review_v1'`.
- [ ] `confidence_score` between 0–100.

```sql
-- Check evidence & links
select pe.id, pe.title, pe.source_type, pe.relevance_score, pe.generated_by,
       pdel.link_type
from product_decision_evidence_links pdel
join product_evidence pe on pe.id = pdel.evidence_id
where pdel.decision_id = '<DECISION_ID>';
```
- [ ] ≥ 1 row if feedback was retrieved.
- [ ] `pe.generated_by = 'decision_review_v1'`.
- [ ] `pe.title` or `pe.content` contains `zephyr-checkout-widget` or `Enterprise Payment Survey`.

```sql
-- Check confidence updated on decision
select id, title, confidence_score from product_decisions where id = '<DECISION_ID>';
```
- [ ] `confidence_score` is not null, matches recommendation confidence.

```sql
-- Check AI usage
select feature, model, status, prompt_tokens, completion_tokens, estimated_cost,
       metadata->>'decisionId' as decision_id,
       metadata->>'evidenceCount' as evidence_count,
       metadata->>'retryCount' as retry_count,
       metadata->>'promptVersion' as prompt_version
from ai_usage
where feature = 'decision_review'
order by created_at desc
limit 1;
```
- [ ] `status = 'success'`.
- [ ] `prompt_tokens > 0` (if `USE_REAL_AI=true`).
- [ ] `decision_id` matches.
- [ ] `prompt_version = 'v1.1'`.
- [ ] `retry_count = '0'` (no retry needed).

### Verify — Logs (terminal)

| Log | Expected |
|-----|----------|
| `[decision-review] Evidence stats:` | `retrieved` ≥ 0, `used` ≥ 0, `hasRelevantEvidence: true` if feedback ingested |
| No `[decision-review] Attempt` error | Clean first-pass success |

### If It Fails

| Symptom | Diagnosis |
|---------|-----------|
| No evidence found (`used: 0`) | Check `minSimilarity` in intent-config.ts is 0.25. Check `document_chunks` has rows for this project. |
| `generated_by` is null | Migration not run. Run the SQL above. |
| 0 options/assumptions | Zod validation may have failed silently. Check `USE_REAL_AI` and OpenAI key. |
| Error toast | Check terminal for `[decision-review]` error logs. |

---

## 3. No Relevant Evidence

**Goal:** Analysis works but acknowledges limited evidence.

### Setup

Use the same **"Orion Payments"** project. The only feedback is about `zephyr-checkout-widget`.

### Execute

1. Create a new decision:
   - **Title:** `Adopt GraphQL for internal microservices`
   - **Problem Statement:** `Our internal services use REST APIs with inconsistent schemas. Engineering wants to standardize on GraphQL for inter-service communication. We need to evaluate the migration cost, learning curve, and operational impact.`
2. Click **Analyze**.
3. Open the detail page.

### Verify — UI

- [ ] Analysis generated successfully.
- [ ] **Confidence score is lower** than Test 2 (expect 20–50).
- [ ] Recommendation text contains language like "limited evidence", "insufficient data", or "low confidence".
- [ ] **Evidence section** is empty or has 0 cards.
- [ ] No mention of `zephyr-checkout-widget` or payment topics in the analysis.
- [ ] Options still generated (3–4), but with `unknown` effort estimates or lower confidence.

### Verify — Supabase

```sql
select count(*) from product_decision_evidence_links where decision_id = '<GRAPHQL_DECISION_ID>';
```
- [ ] 0 rows (no evidence linked).

```sql
select confidence_score from product_decisions where id = '<GRAPHQL_DECISION_ID>';
```
- [ ] Lower than the checkout decision's confidence.

### Verify — Logs

| Log | Expected |
|-----|----------|
| `[decision-review] Evidence stats:` | `hasRelevantEvidence: false` or `used: 0` |

---

## 4. Re-Analysis / Duplicate Prevention

**Goal:** Second analysis replaces first, no duplicates.

### Setup

Use the checkout decision from Test 2 (already analyzed once).

### Execute — Count Before

```sql
select 'options' as type, count(*) from product_decision_options where decision_id = '<DECISION_ID>'
union all
select 'assumptions', count(*) from product_assumptions where decision_id = '<DECISION_ID>'
union all
select 'recommendations', count(*) from product_decision_recommendations where decision_id = '<DECISION_ID>'
union all
select 'evidence_links', count(*) from product_decision_evidence_links where decision_id = '<DECISION_ID>';
```

Record the counts.

### Execute — Re-Analyze

1. Click **Analyze** (or **Re-Analyze**) on the same decision.
2. Wait for completion.

### Execute — Count After

Run the same SQL again.

### Verify

- [ ] **Options count:** Same as before (3–4), not doubled.
- [ ] **Assumptions count:** Same or similar, not doubled.
- [ ] **Recommendations count:** Exactly 1.
- [ ] **Evidence links count:** Same or similar.
- [ ] All records have `generated_by = 'decision_review_v1'`.
- [ ] `confidence_score` on decision is updated (may differ slightly from first run).
- [ ] `ai_usage` has 2 rows for `decision_review` (one per analysis run).

### If It Fails

| Symptom | Diagnosis |
|---------|-----------|
| Record counts doubled | Old records not being deleted. Check `deleteOldRecords()` filters for `generated_by === GENERATED_BY`. |
| Old records have `generated_by = null` | These are from before migration. They won't be auto-deleted (by design). Delete them manually if needed. |

---

## 5. Failure Safety

**Goal:** If re-analysis fails, previous analysis remains.

### Safest Simulation Method

1. Analyze the decision once successfully (from Test 2).
2. **Temporarily** change `.env.local`:
   ```
   OPENAI_API_KEY=sk-invalid-key-for-testing-only
   ```
3. **Restart the dev server** (`Ctrl+C`, then `npm run dev`).
4. Click **Re-Analyze** on the same decision.
5. **Restore** the real API key and restart.

### Verify

- [ ] UI shows error toast: "Could not analyze decision. Please try again." or similar.
- [ ] **Previous analysis is still visible** on the detail page (recommendation, options, assumptions).
- [ ] No records were deleted (counts unchanged from Test 4).
- [ ] No new `generated_by = 'decision_review_v1'` records created.

```sql
-- Verify old records still exist
select count(*) from product_decision_options where decision_id = '<DECISION_ID>' and generated_by = 'decision_review_v1';
-- Should match pre-failure count
```

- [ ] `ai_usage` has a row with `status = 'error'` for the failed attempt.

### Alternative (no API key change needed)

Set `USE_REAL_AI=false` — this uses mock output which always succeeds, so it can't test failure. The invalid API key method is the safest real test.

---

## 6. Rate Limit

**Goal:** Heavy AI rate limit (5 per 15 min) prevents abuse.

### Execute

1. Click **Analyze** on any decision.
2. Wait for completion.
3. Repeat 4 more times rapidly (total 5 calls).
4. On the **6th** click:

### Verify

- [ ] API returns **429** (visible in browser Network tab).
- [ ] UI shows toast: "Rate limit reached. Please try again later."
- [ ] No OpenAI call was made for the 6th request.
- [ ] `ai_usage` has exactly 5 `decision_review` rows for this 15-minute window (the blocked one is not tracked as `success`).

### Note

If you're an admin (`ADMIN_EMAILS` includes your email), rate limiting is bypassed. Test with a non-admin mock user or temporarily remove `ADMIN_EMAILS`.

---

## 7. Cross-Project Isolation

**Goal:** Project A decision cannot use Project B evidence.

### Setup

1. Create project **"Nebula CRM"**.
2. Add feedback to **Nebula CRM**:
   - **Title:** `CRM User Onboarding Survey`
   - **Content:**
     ```
     The quantum-pipeline-sync feature confused 90% of new users during
     onboarding. Most users expected drag-and-drop pipeline management
     but got a CLI-based sync tool. NPS score dropped to -15 after launch.
     ```
   - **Source:** `user_research`
3. Wait 3 seconds.

### Execute

4. Switch to **"Orion Payments"** project.
5. Create a new decision:
   - **Title:** `Evaluate quantum-pipeline-sync integration`
   - **Problem Statement:** `Should we integrate quantum-pipeline-sync into our payment processing workflow?`
6. Click **Analyze**.

### Verify — UI

- [ ] Analysis completes.
- [ ] **No mention** of "NPS score dropped to -15", "CRM", "drag-and-drop pipeline", or "CLI-based sync tool".
- [ ] Evidence section is empty (no Nebula CRM feedback).
- [ ] Confidence is low (no evidence).

### Verify — Supabase

```sql
-- Check evidence links — should be 0 or only from Orion Payments
select pe.project_id, pe.title, pe.content
from product_decision_evidence_links pdel
join product_evidence pe on pe.id = pdel.evidence_id
where pdel.decision_id = '<QUANTUM_DECISION_ID>';
```
- [ ] 0 rows, or all rows have `project_id` = Orion Payments UUID.
- [ ] No row contains `quantum-pipeline-sync` or `NPS` from Nebula CRM.

### Verify — Logs

| Log | Expected |
|-----|----------|
| `[decision-review] Evidence stats:` | `hasRelevantEvidence: false` — the lexical guard should also filter since "quantum-pipeline-sync" is hyphenated and won't match any Orion Payments chunks |

---

## 8. Citation Validation

**Goal:** Invalid citation IDs are stripped before saving.

### How It Works

The `sanitizeCitationIds()` function runs after AI output is received. It filters `supportingCitationIds` arrays to only include IDs present in the `validCitationIds` set (built from actual retrieved evidence).

### Can It Be Tested Manually?

**Indirectly yes.** When evidence exists, the AI may reference `[1]`, `[2]`, etc. If the AI hallucinates `[5]` but only 2 citations exist, it's stripped.

**Direct test (if needed):**

1. Add a temporary log in `decision-review-service.ts` after `sanitizeCitationIds()`:
   ```typescript
   if (isDev) {
     const allCitationRefs = [
       ...aiOutput.assumptions.flatMap(a => a.supportingCitationIds ?? []),
       ...aiOutput.options.flatMap(o => o.supportingCitationIds ?? []),
       ...aiOutput.risks.flatMap(r => r.supportingCitationIds ?? []),
     ];
     console.log("[decision-review] Citation IDs after sanitization:", allCitationRefs);
   }
   ```
2. Run analysis on a decision with evidence.
3. Check that all logged citation IDs are in the `validCitationIds` set.

### Verify

- [ ] No `supportingCitationIds` in saved records reference non-existent evidence.
- [ ] `recommendation.supporting_evidence` is free-text (not citation IDs) — no validation needed.
- [ ] No broken evidence links in `product_decision_evidence_links`.

---

## 9. Supabase Verification Queries

### All generated records for a decision

```sql
-- Replace <DID> with decision UUID

-- Options
select id, title, effort_estimate, confidence_score, generated_by, created_at
from product_decision_options where decision_id = '<DID>' order by created_at;

-- Assumptions
select id, left(statement, 60), type, risk_level, evidence_status, generated_by
from product_assumptions where decision_id = '<DID>' order by created_at;

-- Recommendation
select id, left(recommendation, 80), confidence_score, generated_by, created_at
from product_decision_recommendations where decision_id = '<DID>';

-- Evidence + links
select pe.id, pe.title, pe.source_type, pe.relevance_score, pe.generated_by,
       pdel.link_type, pdel.decision_id
from product_decision_evidence_links pdel
join product_evidence pe on pe.id = pdel.evidence_id
where pdel.decision_id = '<DID>';

-- Decision confidence
select id, title, confidence_score, updated_at from product_decisions where id = '<DID>';

-- AI usage
select id, feature, model, status, prompt_tokens, completion_tokens,
       estimated_cost, latency_ms,
       metadata->>'decisionId' as did,
       metadata->>'evidenceCount' as ev_count,
       metadata->>'retryCount' as retries,
       metadata->>'confidenceScore' as conf,
       metadata->>'promptVersion' as pv
from ai_usage where feature = 'decision_review' order by created_at desc limit 5;
```

### Check for orphaned/duplicate records

```sql
-- Should return 0 if cleanup worked
select decision_id, count(*) as cnt
from product_decision_recommendations
group by decision_id having count(*) > 1;

-- Options per decision (should be 3-4, not 6-8)
select decision_id, count(*) from product_decision_options
where generated_by = 'decision_review_v1'
group by decision_id;
```

---

## 10. Logs to Watch

### Expected Logs (terminal running `npm run dev`)

| Log prefix | When | Contains |
|------------|------|----------|
| `[decision-review] Evidence stats:` | Every analysis | `retrieved`, `used`, `hasRelevantEvidence`, `minSimilarity`, `maxSimilarity` |
| `[rag] Vector search OK:` | During evidence retrieval | `rpcResults`, `fallback`, `projectId` |
| `[rag] Quality filter:` | During evidence retrieval | `usedChunks`, `discardedChunks`, `hasRelevantContext`, `lexicalGuardApplied` |
| `[decision-review] Attempt N: Zod failed:` | Only on invalid AI output | Validation error summary |
| `[AI_USAGE_TRACK_ERROR]` | Only if tracking fails | Error details |

### Red Flags 🚩

| Red flag | What it means |
|----------|---------------|
| `hasRelevantEvidence: false` when relevant feedback exists | Evidence threshold too high or embeddings not ingested |
| `generated_by` is `null` on new records | Migration not applied |
| Record counts double after re-analysis | Old records not being cleaned up — check `deleteOldRecords()` |
| Evidence from another project appears | Cross-project leak — check `retrieveEvidence` projectId scoping |
| Previous analysis disappears after failed re-analysis | Insert-before-delete broken — check save order |
| Citation IDs like `[5]` when only 2 evidence items exist | `sanitizeCitationIds()` not running |
| `retryCount: 1` frequently | AI struggling with schema — check prompt/schema alignment |

---

## 11. Final Pass/Fail Checklist

| # | Test | Key Assertion | Pass? |
|---|------|---------------|-------|
| 2a | Happy path — UI | Recommendation, 3-4 options, assumptions, evidence visible | ☐ |
| 2b | Happy path — DB | All records have `generated_by = 'decision_review_v1'` | ☐ |
| 2c | Happy path — Evidence | At least 1 evidence card references project feedback | ☐ |
| 2d | Happy path — Confidence | `confidence_score` updated on decision | ☐ |
| 2e | Happy path — Usage | `ai_usage` row with `feature = 'decision_review'`, `status = 'success'` | ☐ |
| 3a | No evidence — UI | Analysis generated, confidence lower, "limited evidence" stated | ☐ |
| 3b | No evidence — DB | 0 evidence links, lower confidence_score | ☐ |
| 4a | Re-analysis — no duplicates | Option/assumption counts same, not doubled | ☐ |
| 4b | Re-analysis — recommendation | Exactly 1 recommendation row | ☐ |
| 5a | Failure safety — UI | Error toast, previous analysis visible | ☐ |
| 5b | Failure safety — DB | Old records unchanged, no new partial records | ☐ |
| 6a | Rate limit — 429 | 6th request returns 429 | ☐ |
| 6b | Rate limit — UI | Clear rate limit message | ☐ |
| 7a | Cross-project — UI | No Nebula CRM content in Orion analysis | ☐ |
| 7b | Cross-project — DB | No cross-project evidence links | ☐ |
| 8 | Citation IDs | No invalid citation IDs in saved records | ☐ |
| 9 | Supabase queries | All verification queries return expected results | ☐ |
| 10 | Logs | No red flags in dev logs | ☐ |

---

## Quick Reference: Test Projects & Phrases

| Project | Unique Phrase | Purpose |
|---------|---------------|---------|
| Orion Payments | `zephyr-checkout-widget` | Happy path feedback |
| Nebula CRM | `quantum-pipeline-sync` | Cross-project isolation |

| Decision | Project | Evidence Expected? |
|----------|---------|-------------------|
| Rebuild checkout payment processing | Orion Payments | ✅ Yes |
| Adopt GraphQL for internal microservices | Orion Payments | ❌ No |
| Evaluate quantum-pipeline-sync integration | Orion Payments | ❌ No (belongs to Nebula CRM) |

