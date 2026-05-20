# Landing Page Truthfulness Test Plan

Manual QA plan to verify that every claim on the ProductMind landing page is backed by real, working product behavior.

---

## 1. Prerequisites

| Requirement | Details |
|---|---|
| Deployed URL | `NEXT_PUBLIC_SITE_URL` (e.g. `https://project-mind-ten.vercel.app`) |
| Supabase project | Auth enabled, email confirmation on, RLS policies applied |
| Environment variables | `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Test user A | Registered via signup, email confirmed |
| Test user B | Separate account for cross-project isolation tests |
| AI mock mode | `USE_REAL_AI=true` (or unset) for truthfulness tests; mock mode for structure-only checks |
| Rate limit | Test user should **not** be in `ADMIN_EMAILS` for rate-limit tests |

---

## 2. Test Data

### Project 1 — "SmartMenu" (with evidence)

- **Name**: SmartMenu
- **Description**: AI-powered restaurant menu recommendation engine
- **Target users**: Restaurant owners, diners
- **Goals**: Increase average order value, reduce decision fatigue
- **Feedback document** (unique phrase for retrieval verification):
  > "During the Lisbon pilot, 73% of diners said the allergen filter was more important than personalized suggestions."

### Project 2 — "SmartMenu" decision without evidence

- Use the same project but create a decision on a topic **not** covered by any uploaded document (e.g. "Should we support cryptocurrency payments?").

### Project 3 — "FitTrack" (cross-project isolation)

- **Name**: FitTrack
- **Description**: Wearable fitness analytics dashboard
- **Feedback document** (unique phrase):
  > "Beta testers in the Helsinki cohort reported that sleep tracking accuracy dropped below 60% on devices with AMOLED screens."

Owned by **Test user B**.

---

## 3. Evidence-Grounded Decision Reviews

**Landing claim**: _"Analyze product decisions using retrieved project evidence and structured AI reasoning."_

| # | Step | Expected | Result |
|---|---|---|---|
| 3.1 | Create project "SmartMenu" and add the Lisbon pilot feedback document. | Document saved, embeddings generated (check `feedback_documents` table, `embeddings_outdated = false`). | ▢ PASS · ▢ FAIL |
| 3.2 | Create a decision: "Should we prioritize allergen filtering over personalized recommendations?" | Decision row created in `product_decisions`. | ▢ PASS · ▢ FAIL |
| 3.3 | Click **Analyze Decision**. | AI review completes without error. | ▢ PASS · ▢ FAIL |
| 3.4 | Verify options are generated. | `product_decision_options` has ≥ 2 rows for this decision. | ▢ PASS · ▢ FAIL |
| 3.5 | Verify assumptions are generated. | `product_assumptions` has ≥ 1 row linked to this decision. | ▢ PASS · ▢ FAIL |
| 3.6 | Verify evidence is retrieved from feedback. | `product_evidence` contains a row referencing the Lisbon pilot phrase or the source document. | ▢ PASS · ▢ FAIL |
| 3.7 | Verify evidence is linked to the decision. | `product_decision_evidence_links` has a row connecting the decision to the evidence. | ▢ PASS · ▢ FAIL |
| 3.8 | Verify recommendation is generated. | `product_decision_recommendations` has ≥ 1 row. | ▢ PASS · ▢ FAIL |
| 3.9 | Verify UI displays evidence/citations. | Decision detail page shows evidence cards or citation references. | ▢ PASS · ▢ FAIL |
| 3.10 | **Cross-project isolation**: Log in as Test user A. Run Analyze Decision on SmartMenu. Verify no FitTrack evidence appears. | No Helsinki/AMOLED/FitTrack content in results. | ▢ PASS · ▢ FAIL |

**SQL verification queries:**

```sql
-- 3.4 Options
SELECT id, title, pros, cons FROM product_decision_options
WHERE decision_id = '<DECISION_ID>';

-- 3.5 Assumptions
SELECT id, assumption_text, status FROM product_assumptions
WHERE decision_id = '<DECISION_ID>';

-- 3.6 Evidence
SELECT id, content, source_type, source_id FROM product_evidence
WHERE decision_id = '<DECISION_ID>';

-- 3.7 Evidence links
SELECT * FROM product_decision_evidence_links
WHERE decision_id = '<DECISION_ID>';

-- 3.8 Recommendation
SELECT id, recommendation_text, confidence_score FROM product_decision_recommendations
WHERE decision_id = '<DECISION_ID>';
```

---

## 4. Confidence-Scored Recommendations

**Landing claim**: _"Get options, assumptions, risks, and a confidence-scored recommendation."_

| # | Step | Expected | Result |
|---|---|---|---|
| 4.1 | After test 3.3, check `product_decisions.confidence_score`. | Non-null numeric value (0–100). | ▢ PASS · ▢ FAIL |
| 4.2 | Check `product_decision_recommendations.confidence_score`. | Non-null numeric value (0–100). | ▢ PASS · ▢ FAIL |
| 4.3 | Verify confidence is displayed in UI. | Decision detail page shows "Confidence: **X%**". | ▢ PASS · ▢ FAIL |
| 4.4 | Create a decision with **no relevant evidence** ("Should we support cryptocurrency payments?") and run Analyze. | Confidence score should still appear but may be lower than 4.1/4.2. | ▢ PASS · ▢ FAIL |
| 4.5 | Compare confidence scores from 4.1 and 4.4. | Score with evidence ≥ score without evidence (not guaranteed but directionally expected). | ▢ PASS · ▢ FAIL · ▢ INCONCLUSIVE |

**SQL verification:**

```sql
-- 4.1
SELECT id, title, confidence_score FROM product_decisions
WHERE id = '<DECISION_ID>';

-- 4.2
SELECT id, confidence_score FROM product_decision_recommendations
WHERE decision_id = '<DECISION_ID>';
```

---

## 5. PRDs & Prioritized Roadmaps

**Landing claim**: _"Generate stakeholder-ready PRDs and RICE/ICE-scored roadmaps from your project context."_

### 5a. PRD Generation

| # | Step | Expected | Result |
|---|---|---|---|
| 5.1 | Navigate to SmartMenu → PRD page. | PRD generation form/UI loads. | ▢ PASS · ▢ FAIL |
| 5.2 | Generate a PRD. | PRD is created with structured sections (executive summary, user stories, success metrics, etc.). | ▢ PASS · ▢ FAIL |
| 5.3 | Verify PRD is persisted. | Row exists in `prds` table for this project. | ▢ PASS · ▢ FAIL |
| 5.4 | Verify PRD detail view loads. | Navigate to `/projects/[id]/prd/[prdId]` — content renders. | ▢ PASS · ▢ FAIL |

### 5b. Feature Prioritization (RICE/ICE)

| # | Step | Expected | Result |
|---|---|---|---|
| 5.5 | Navigate to SmartMenu → Features page. Add 3+ features. | Features saved. | ▢ PASS · ▢ FAIL |
| 5.6 | Run AI scoring. | Each feature gets reach, impact, confidence, effort scores. RICE and/or ICE scores calculated. | ▢ PASS · ▢ FAIL |
| 5.7 | Verify sorting by RICE/ICE works. | Table is sortable by score columns. | ▢ PASS · ▢ FAIL |

### 5c. Roadmap Generation

| # | Step | Expected | Result |
|---|---|---|---|
| 5.8 | Navigate to SmartMenu → Roadmap page. | Roadmap generation UI loads. | ▢ PASS · ▢ FAIL |
| 5.9 | Generate roadmap. | Output includes Now/Next/Later view and/or 30/60/90-day plan. | ▢ PASS · ▢ FAIL |
| 5.10 | Verify roadmap is persisted. | Row exists in `roadmaps` table. | ▢ PASS · ▢ FAIL |
| 5.11 | Verify risks, dependencies, success metrics sections. | At least some of these sections appear in output. | ▢ PASS · ▢ FAIL |

---

## 6. Multi-Perspective Strategic Analysis

**Landing claim**: _"PM, CTO, UX Researcher, and Growth Marketer personas evaluate your product independently, then surface a consensus with blind spots."_

| # | Step | Expected | Result |
|---|---|---|---|
| 6.1 | Navigate to SmartMenu → Multi-Agent Review page. | Review UI loads. | ▢ PASS · ▢ FAIL |
| 6.2 | Run multi-agent review. | Review completes without error. | ▢ PASS · ▢ FAIL |
| 6.3 | Verify exactly 4 persona responses. | Output contains sections for: **Product Manager**, **CTO**, **UX Researcher**, **Growth Marketer**. | ▢ PASS · ▢ FAIL |
| 6.4 | Verify persona labels match landing page copy. | UI labels match exactly: "Product Manager", "CTO", "UX Researcher", "Growth Marketer". | ▢ PASS · ▢ FAIL |
| 6.5 | Verify consensus summary exists. | A combined consensus section is displayed after individual perspectives. | ▢ PASS · ▢ FAIL |
| 6.6 | Verify review is persisted. | Row exists in `multi_agent_reviews` table. | ▢ PASS · ▢ FAIL |

### 6b. Competitive Analysis

| # | Step | Expected | Result |
|---|---|---|---|
| 6.7 | Navigate to SmartMenu → Competitive Analysis. | Competitive analysis UI loads. | ▢ PASS · ▢ FAIL |
| 6.8 | Generate competitive analysis. | Output includes competitors, feature comparison, positioning insights. | ▢ PASS · ▢ FAIL |
| 6.9 | Verify persistence. | Row in `competitive_analyses` table. | ▢ PASS · ▢ FAIL |

---

## 7. Context-Aware AI Retrieval

**Landing claim**: _"Documents are indexed for context-aware AI retrieval."_

| # | Step | Expected | Result |
|---|---|---|---|
| 7.1 | Open SmartMenu → AI Chat. Ask: "What did users say about allergen filtering in the Lisbon pilot?" | Response references the Lisbon pilot feedback content. | ▢ PASS · ▢ FAIL |
| 7.2 | Ask an unrelated question: "What is the capital of France?" | Response does **not** inject project feedback as context. | ▢ PASS · ▢ FAIL |
| 7.3 | **Cross-project**: In SmartMenu chat, ask "What did beta testers say about sleep tracking on AMOLED screens?" | Response does **not** contain FitTrack/Helsinki content. | ▢ PASS · ▢ FAIL |
| 7.4 | Verify embeddings exist in DB. | `document_chunks` table has rows for the SmartMenu feedback document with non-null `embedding`. | ▢ PASS · ▢ FAIL |

**SQL verification:**

```sql
-- 7.4
SELECT id, document_id, content, embedding IS NOT NULL AS has_embedding
FROM document_chunks
WHERE document_id IN (
  SELECT id FROM feedback_documents WHERE project_id = '<SMARTMENU_PROJECT_ID>'
);
```

---

## 8. Landing Page Copy Verification

| # | Check | Expected | Result |
|---|---|---|---|
| 8.1 | No fake testimonials or quotes on page. | None present. | ▢ PASS · ▢ FAIL |
| 8.2 | No fake customer/company logos. | None present. | ▢ PASS · ▢ FAIL |
| 8.3 | No fake usage metrics (e.g. "10,000 PMs use…"). | None present. | ▢ PASS · ▢ FAIL |
| 8.4 | "Evidence-Grounded Decision Reviews" — supported by tests 3.x. | Claim matches behavior. | ▢ PASS · ▢ FAIL |
| 8.5 | "confidence-scored recommendation" — supported by tests 4.x. | Claim matches behavior. | ▢ PASS · ▢ FAIL |
| 8.6 | "PRDs & Prioritized Roadmaps" — supported by tests 5.x. | Claim matches behavior. | ▢ PASS · ▢ FAIL |
| 8.7 | "PM, CTO, UX Researcher, and Growth Marketer" — supported by tests 6.x. | Exact persona names match code. | ▢ PASS · ▢ FAIL |
| 8.8 | "Documents are indexed for context-aware AI retrieval" — supported by tests 7.x. | Claim matches behavior. | ▢ PASS · ▢ FAIL |
| 8.9 | FAQ answer about rate limits ("20 standard/hour, 5 heavy/15min") matches `src/lib/ai/rate-limit.ts`. | Values match code. | ▢ PASS · ▢ FAIL |
| 8.10 | FAQ answer about AI model ("GPT-4o", "text-embedding-3-small") matches actual API calls. | Model names match code. | ▢ PASS · ▢ FAIL |
| 8.11 | "Built with" footer strip lists only real technologies used. | All listed technologies (Next.js, TypeScript, Supabase, pgvector, OpenAI) are in the codebase. | ▢ PASS · ▢ FAIL |

---

## 9. Regression Checks

| # | Check | Expected | Result |
|---|---|---|---|
| 9.1 | Sign up with new email. | Confirmation email received, redirect to app after confirming. | ▢ PASS · ▢ FAIL |
| 9.2 | Sign in with existing user. | Redirects to `/dashboard`. | ▢ PASS · ▢ FAIL |
| 9.3 | Sign out. | Redirects to landing page at correct domain (`NEXT_PUBLIC_SITE_URL`). | ▢ PASS · ▢ FAIL |
| 9.4 | Email confirmation redirect. | Redirect goes to production URL, not `localhost`. | ▢ PASS · ▢ FAIL |
| 9.5 | Rate limiting (non-admin). | After 20 standard AI calls in 1 hour, next call returns 429. | ▢ PASS · ▢ FAIL |
| 9.6 | Admin bypass. | User in `ADMIN_EMAILS` is not rate-limited. | ▢ PASS · ▢ FAIL |
| 9.7 | Landing page — desktop layout. | All sections render, no overflow, CTA buttons work. | ▢ PASS · ▢ FAIL |
| 9.8 | Landing page — mobile layout (≤640px). | Responsive, no horizontal scroll, readable text, tappable buttons. | ▢ PASS · ▢ FAIL |
| 9.9 | CTA "Get started — it's free" links to `/sign-up` (logged out) or `/dashboard` (logged in). | Correct link. | ▢ PASS · ▢ FAIL |

---

## 10. Summary Pass/Fail Checklist

| Section | Tests | Pass | Fail | Notes |
|---|---|---|---|---|
| 3 — Evidence-Grounded Decision Reviews | 3.1–3.10 | | | |
| 4 — Confidence Scores | 4.1–4.5 | | | |
| 5 — PRDs & Roadmaps | 5.1–5.11 | | | |
| 6 — Multi-Perspective Analysis | 6.1–6.9 | | | |
| 7 — Context-Aware Retrieval | 7.1–7.4 | | | |
| 8 — Landing Copy Verification | 8.1–8.11 | | | |
| 9 — Regression | 9.1–9.9 | | | |

**Overall verdict**: ▢ ALL PASS · ▢ HAS FAILURES

---

## Claims Requiring Extra Manual Attention

1. **Test 4.5 (confidence comparison)**: The AI may not always produce lower confidence without evidence. Mark as INCONCLUSIVE if scores are similar — this is a directional expectation, not a guaranteed behavior.
2. **Test 7.2 (irrelevant question)**: The RAG quality gate should prevent injection, but edge cases depend on embedding similarity thresholds.
3. **Test 9.5 (rate limiting)**: In-memory rate limiter resets on serverless cold starts. Testing requires sustained calls within one instance lifecycle.

---

*Last updated: 2026-05-20*

