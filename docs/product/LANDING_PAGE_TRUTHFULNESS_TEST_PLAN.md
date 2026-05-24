# Landing Page Truthfulness Test Plan

Verifies that every claim on the ProductMind landing page (`src/app/page.tsx`) and structured data (`src/lib/structured-data.ts`) matches real, working product behavior. This is **not** a general regression checklist — see `docs/qa/MANUAL_TESTING.md` for that.

---

## Prerequisites

| Requirement | Details |
|---|---|
| Running app | `npm run dev` or deployed URL |
| Auth | Signed-in user with at least one project containing a feedback document with a unique phrase |
| AI mode | `USE_REAL_AI=true` for claim verification; `USE_REAL_AI=false` acceptable for structural checks only |
| Second user | Separate account for cross-project isolation checks (sections 5, 7) |

---

## 1. Hero Section Claims

**Source**: `src/app/page.tsx` lines 109–136

| # | Claim / Copy | Where to verify | Pass? |
|---|---|---|---|
| 1.1 | "AI-Powered Product Management" | Tagline only — OK if any AI feature works | ☐ |
| 1.2 | "From idea to roadmap, faster" | Verify PRD → Feature Prioritizer → Roadmap flow completes end-to-end | ☐ |
| 1.3 | "structured PRDs, prioritized roadmaps, and competitive insights — grounded in your actual project context" | PRD uses project context (DB fields). Roadmap uses RAG. Competitive analysis uses project context. Confirm none use generic-only prompts. | ☐ |
| 1.4 | CTA "Get started — it's free" links to `/sign-up` (logged out) | Click while logged out → `/sign-up` | ☐ |
| 1.5 | CTA shows "Go to Dashboard" and links to `/dashboard` (logged in) | Click while logged in → `/dashboard` | ☐ |
| 1.6 | "See how it works" links to `/#features` | Click → scrolls to features section | ☐ |

---

## 2. Feature Cards (3 cards)

**Source**: `features` array, `src/app/page.tsx` lines 13–32

### 2a. "Evidence-Grounded Decision Reviews"

| # | Sub-claim | Code truth | Pass? |
|---|---|---|---|
| 2.1 | "Analyze product decisions using retrieved project evidence" | Decision review API retrieves evidence. Check `product_evidence` and `product_decision_evidence_links` tables are populated after analysis. | ☐ |
| 2.2 | "structured AI reasoning" | Output includes options, assumptions, recommendation — verify `product_decision_options`, `product_assumptions`, `product_decision_recommendations` have rows | ☐ |
| 2.3 | "confidence-scored recommendation" | `product_decisions.confidence_score` and `product_decision_recommendations.confidence_score` are non-null after analysis | ☐ |
| 2.4 | "not just a gut feeling" | Marketing phrasing — acceptable if 2.1–2.3 pass | ☐ |

### 2b. "PRDs & Prioritized Roadmaps"

| # | Sub-claim | Code truth | Pass? |
|---|---|---|---|
| 2.5 | "Generate stakeholder-ready PRDs" | PRD generation works (`/api/ai/prd`). ⚠️ "stakeholder-ready" is aspirational — PRDs are AI drafts. Verify output has structured sections. | ☐ |
| 2.6 | "RICE/ICE-scored roadmaps from your project context" | Feature Prioritizer produces RICE/ICE scores. Roadmap generates Now/Next/Later view. | ☐ |
| 2.7 | "user stories, success metrics, Now/Next/Later timelines, and dependency mapping" | Verify PRD output contains user stories and success metrics. Verify roadmap output contains Now/Next/Later and dependencies. | ☐ |

### 2c. "Multi-Perspective Strategic Analysis"

| # | Sub-claim | Code truth | Pass? |
|---|---|---|---|
| 2.8 | "PM, CTO, UX Researcher, and Growth Marketer personas" | Multi-agent review (`/api/ai/multi-agent-review`) uses exactly these 4 personas. Verify in prompt/output. | ☐ |
| 2.9 | "evaluate your product independently, then surface a consensus with blind spots" | Output has 4 individual sections + consensus summary | ☐ |
| 2.10 | "competitive landscape analysis" linked to multi-perspective | Competitive analysis is a separate feature (`/api/ai/competitive-analysis`), not part of multi-agent review. Verify card description doesn't conflate them. | ☐ |

---

## 3. "How It Works" Section (3 steps)

**Source**: `workflows` array, `src/app/page.tsx` lines 34–50

| # | Claim | Code truth | Pass? |
|---|---|---|---|
| 3.1 | Step 01: "Define your product — target users, goals, business model, constraints, and open questions" | Context Builder has these fields. Project form has: name, description, target_users, market, business_model, goals. | ☐ |
| 3.2 | Step 02: "Documents are indexed for context-aware AI retrieval" | Feedback upload triggers chunking + embedding via pgvector. Verify `document_chunks` table has rows with non-null `embedding`. | ☐ |
| 3.3 | Step 03: "ready for export and review" | ⚠️ **FLAGGED**. No export/download feature exists. "Review" is accurate (view-only). Copy should remove "export" or clarify it means copy-paste. | ☐ FLAGGED |

---

## 4. Capabilities Grid (8 items)

**Source**: `capabilities` array, `src/app/page.tsx` lines 52–61

| # | Label | Detail claim | Uses RAG? | Accurate? | Pass? |
|---|---|---|---|---|---|
| 4.1 | PRD Generation | "Structured requirements from a product idea" | No — DB context only | Yes | ☐ |
| 4.2 | RICE & ICE Scoring | "Framework-based feature prioritization" | No | Yes | ☐ |
| 4.3 | Roadmap Builder | "Now/Next/Later + 30/60/90-day plans" | **Yes** | Yes | ☐ |
| 4.4 | Competitive Analysis | "Market gaps, positioning, feature comparison" | No — DB context only | Yes | ☐ |
| 4.5 | Multi-Agent Review | "PM, CTO, UX, Growth perspectives + consensus" | **Yes** (optional) | Yes | ☐ |
| 4.6 | Decision Engine | "Structured options, assumptions, and evidence" | Implicit via evidence retrieval | Yes | ☐ |
| 4.7 | RAG-Powered Context | "Feedback docs embedded via pgvector" | **Yes** (this IS the RAG feature) | Yes | ☐ |
| 4.8 | AI Chat per Project | "Context-aware assistant with retrieval" | **Yes** | Yes | ☐ |

**Note**: No capability card mentions Global AI Assistant. Correct — global chat has no project context and must not be marketed as "context-aware."

---

## 5. FAQ Truthfulness

**Source**: `faqItems` in `src/lib/structured-data.ts`

| # | FAQ question | Risky claim | Accurate? | Pass? |
|---|---|---|---|---|
| 5.1 | "What exactly does ProductMind do?" | "production-ready PRDs" | ⚠️ Overclaimed. PRDs are AI-generated drafts. Should say "structured PRDs." | ☐ FLAGGED |
| 5.2 | "How does the AI actually work?" | "GPT-4o" and "text-embedding-3-small" | Verify against `src/lib/openai.ts` and embedding code | ☐ |
| 5.3 | "How does the AI actually work?" | "RAG to ground outputs in your actual project context" | Only 3/8 AI features use RAG (chat, roadmap, multi-agent-review). Others use DB context only. Implies all features use RAG. | ☐ FLAGGED |
| 5.4 | "Can I edit the AI-generated content?" | "copy results for use in your own documents" | No copy-to-clipboard button exists. Users can manually select+copy only. | ☐ FLAGGED |
| 5.5 | "Can I edit the AI-generated content?" | "In-app editing … is on the roadmap" | Acceptable — clearly labeled as future | ☐ |
| 5.6 | "Is ProductMind free?" | "20 standard operations per hour, 5 heavy operations per 15 minutes" | Matches `rate-limiter.ts` TIER_LIMITS exactly | ☐ |
| 5.7 | "Is my data stored securely?" | "row-level security (RLS) enabled" | Verify RLS policies exist in Supabase migrations | ☐ |
| 5.8 | "Is my data stored securely?" | "OAuth support" | Verify OAuth is configured in Supabase | ☐ |
| 5.9 | "What are the AI's limitations?" | "decision-support tool, not a decision-making tool" | Honest framing — good | ☐ |

---

## 6. Footer Claims

**Source**: `src/app/page.tsx` lines 234–251

| # | Claim | Accurate? | Pass? |
|---|---|---|---|
| 6.1 | "Built with Next.js, TypeScript, Supabase, pgvector, and OpenAI" | All present in codebase | ☐ |
| 6.2 | "RAG-grounded AI outputs" | Partially true — only chat, roadmap, multi-agent-review use RAG. Others use DB context. | ☐ |
| 6.3 | "Row-level security" | Verify in Supabase migrations | ☐ |
| 6.4 | "Rate-limited production API" | Rate limiter is in-memory, resets on serverless cold start. "Production" slightly overclaimed. | ☐ FLAGGED |
| 6.5 | Privacy, Cookies, Terms links | Verify `/privacy`, `/cookies`, `/terms` pages exist and render | ☐ |

---

## 7. Cross-Project Isolation

| # | Check | Pass? |
|---|---|---|
| 7.1 | AI Chat for Project A does not surface feedback from Project B | ☐ |
| 7.2 | Decision review for Project A does not use Project B's evidence | ☐ |
| 7.3 | Global AI Assistant does not have access to any project's feedback documents | ☐ |

---

## 8. Structured Data / SEO Claims

**Source**: `src/lib/structured-data.ts`

| # | Claim | Accurate? | Pass? |
|---|---|---|---|
| 8.1 | `SoftwareApplication.offers.description`: "Free plan with 10 AI decisions per month" | ⚠️ **WRONG**. Rate limit is 20 standard/hour, not "10 per month." Must be corrected. | ☐ FLAGGED |
| 8.2 | `SoftwareApplication.featureList` includes "Project management dashboard" | ProductMind is a product decision tool, not a project management tool. Misleading. | ☐ FLAGGED |

---

## Summary of Flagged Claims

| # | Location | Issue | Severity | Status |
|---|---|---|---|---|
 3.3  Landing "How it works" step 03  "ready for export" — no export feature exists  Medium  ✅ Fixed → "ready for review"
| 5.1 | FAQ "What does ProductMind do?" | "production-ready PRDs" — AI drafts, not production-ready | Low | ✅ Fixed → "structured PRDs" |
| 5.3 | FAQ "How does the AI work?" | Implies all features use RAG — only 3/8 do | Medium | ✅ Fixed → explicitly lists which features use RAG |
| 5.4 | FAQ "Can I edit?" | "copy results" — no copy button exists | Low | ✅ Fixed → removed "copy results" claim |
| 6.4 | Footer | "Rate-limited production API" — in-memory, resets on cold start | Low | ✅ Fixed → "Rate-limited API" |
| 8.1 | Structured data | "10 AI decisions per month" — wrong, actual is 20/hour | **High** | ✅ Fixed → matches rate-limiter.ts |
| 8.2 | Structured data | "Project management dashboard" — misleading category | Low | ✅ Fixed → replaced with accurate feature list |

---

*Last updated: 2026-05-24*
