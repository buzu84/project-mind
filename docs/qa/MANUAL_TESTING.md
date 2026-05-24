# Manual Testing — Regression Checklist

Practical manual test checklist covering all user-facing features. Each section lists steps, expected results, and known caveats.

**Environment:** `npm run dev` with `USE_MOCK_AUTH=true`, `NEXT_PUBLIC_USE_MOCK_AUTH=true`. Set `USE_REAL_AI=true` for AI tests or `USE_REAL_AI=false` for mock-only (deterministic) tests.

---

## 1. Authentication

> Skip if testing with `USE_MOCK_AUTH=true` (auto-signed-in as `dev@productmind.app`).

| # | Step | Expected | Pass? |
|---|---|---|---|
| 1.1 | Go to `/sign-up`, enter email + password + name | Confirmation email sent, "check your email" message shown | ☐ |
| 1.2 | Click confirmation link in email | Redirected to `/dashboard` or `/sign-in?confirmed=true` | ☐ |
| 1.3 | Go to `/sign-in`, enter valid credentials | Dashboard loads | ☐ |
| 1.4 | Enter invalid credentials on `/sign-in` | Error message shown, no redirect | ☐ |
| 1.5 | Click sign out (sidebar or topbar) | Redirected to `/` or `/sign-in` | ☐ |
| 1.6 | Visit `/dashboard` while signed out | Redirected to `/sign-in` | ☐ |
| 1.7 | Go to `/forgot-password`, enter email | "Reset email sent" message | ☐ |
| 1.8 | Click reset link in email → set new password on `/reset-password` | Password updated, can sign in with new password | ☐ |

**Caveat:** Auth redirects use `NEXT_PUBLIC_SITE_URL`. If this points to `localhost` but Supabase redirect URLs don't include `localhost`, confirmation/reset links will fail.

---

## 2. Projects

| # | Step | Expected | Pass? |
|---|---|---|---|
| 2.1 | Click "New Project" on `/projects` | Project form appears | ☐ |
| 2.2 | Fill name + description, submit | Project created, appears in list | ☐ |
| 2.3 | Click project → click "Edit" | Edit form with pre-filled fields | ☐ |
| 2.4 | Change fields, click **Save Changes** | Changes persist after refresh | ☐ |
| 2.5 | Delete project (from edit page or list) | Project removed, redirected to `/projects` | ☐ |
| 2.6 | Open project detail page | Shows tool cards (Context Builder, Feedback & Research, AI Chat, PRD Generator, Feature Prioritizer, Competitive Analysis, AI Insights, AI Roadmap, Multi-Agent Review, Decisions) and Generated Documents section | ☐ |

---

## 3. Context Builder

| # | Step | Expected | Pass? |
|---|---|---|---|
| 3.1 | Open project → **Context Builder** tab | Form with 8 sections (Product Overview, Target Personas, Current Metrics, Pain Points, Competitors, Strategic Goals, Constraints, Open Questions) | ☐ |
| 3.2 | Fill in some sections, click **Save Context** | Success toast, data persists on refresh | ☐ |
| 3.3 | Clear all fields, save | Saves empty (all fields optional) | ☐ |

---

## 4. Feedback & Research

| # | Step | Expected | Pass? |
|---|---|---|---|
| 4.1 | Open project → **Feedback & Research** tab | Feedback list (empty for new project) | ☐ |
| 4.2 | Click **Add Feedback** | Form with Title, Content, Source dropdown | ☐ |
| 4.3 | Fill title + content, select source (e.g., "Customer Interview"), submit | Feedback appears in list | ☐ |
| 4.4 | Click edit on a feedback card → modify content → save | Changes persist | ☐ |
| 4.5 | Delete a feedback document | Removed from list | ☐ |

**Source dropdown options:** Customer Interview, Support Ticket, App Review, Sales Call, Internal Note.

**Caveat:** Embedding ingestion happens asynchronously on save. Wait ~3 seconds before testing RAG retrieval.

---

## 5. PRD Generator

| # | Step | Expected | Pass? |
|---|---|---|---|
| 5.1 | Open project → **PRD Generator** tab | Form with product name, description, target audience fields | ☐ |
| 5.2 | Fill fields, click **Generate PRD** | Loading state → PRD content appears | ☐ |
| 5.3 | Click the generated PRD to view detail page | Rendered document with sections, sticky TOC if applicable | ☐ |
| 5.4 | Return to project detail page → **Generated Documents** section | PRD listed with title and date | ☐ |

---

## 6. Competitive Analysis

| # | Step | Expected | Pass? |
|---|---|---|---|
| 6.1 | Open project → **Competitive Analysis** tab | Form with product name, industry, competitors fields | ☐ |
| 6.2 | Fill fields, click **Analyze Competition** | Loading state → analysis content appears | ☐ |
| 6.3 | Click the generated analysis to view detail page | Rendered document | ☐ |
| 6.4 | Check **Generated Documents** on project page | Analysis listed | ☐ |

---

## 7. Feature Prioritizer

| # | Step | Expected | Pass? |
|---|---|---|---|
| 7.1 | Open project → **Feature Prioritizer** tab | Feature ideas table (empty for new project) | ☐ |
| 7.2 | Add a feature idea (name + description) | Appears in table with no scores | ☐ |
| 7.3 | Add 2-3 more features | All listed | ☐ |
| 7.4 | Click **AI Score All** | Loading state → RICE/ICE scores populate for all features | ☐ |
| 7.5 | Edit a feature → change description | Changes persist | ☐ |
| 7.6 | Delete a feature | Removed from table | ☐ |

---

## 8. AI Insights

| # | Step | Expected | Pass? |
|---|---|---|---|
| 8.1 | Open project → **AI Insights** tab | Empty or previously generated insights | ☐ |
| 8.2 | Click **Generate AI Insights** (or **Regenerate Insights** if existing) | Loading → insight cards appear (7-12 cards) | ☐ |
| 8.3 | Each card shows type (risk/opportunity/etc.), priority, explanation | Correctly rendered, no raw JSON | ☐ |

---

## 9. AI Roadmap

| # | Step | Expected | Pass? |
|---|---|---|---|
| 9.1 | Open project → **AI Roadmap** tab | Empty or previously generated roadmap | ☐ |
| 9.2 | Click **Generate Roadmap** (or **Regenerate Roadmap**) | Loading → roadmap renders with Now/Next/Later sections | ☐ |
| 9.3 | Verify 30/60/90 day plans, risks, dependencies, success metrics sections | All render, no raw JSON | ☐ |
| 9.4 | Click **Delete Roadmap** | Roadmap removed, empty state shown | ☐ |

---

## 10. Multi-Agent Review

| # | Step | Expected | Pass? |
|---|---|---|---|
| 10.1 | Open project → **Multi-Agent Review** tab | Form with question input and options | ☐ |
| 10.2 | Enter a product question, click **Run Multi-Agent Review** | Loading → 4 perspective cards (PM, CTO, UX, Growth) + consensus | ☐ |
| 10.3 | Each perspective shows summary, key points, concerns, recommendations | Correctly rendered | ☐ |
| 10.4 | Consensus shows overall recommendation | Rendered with recommendation type | ☐ |

---

## 11. Decisions & Decision Review

| # | Step | Expected | Pass? |
|---|---|---|---|
| 11.1 | Open project → **Decisions** tab | Decisions list (empty for new project) | ☐ |
| 11.2 | Click **New Decision** → fill title + problem statement → save | Decision appears in list | ☐ |
| 11.3 | Click **Analyze** on a decision in the list | "Analyzing…" loading state → completes | ☐ |
| 11.4 | Click decision title → detail page | Shows 💡 Recommendation, Decision Options (3-4), Assumptions, Evidence sections | ☐ |
| 11.5 | On detail page, click **Re-Analyze** | New analysis replaces old, no duplicates | ☐ |
| 11.6 | Delete a decision | Removed from list | ☐ |

See [DECISION_REVIEW_TEST_PLAN.md](./DECISION_REVIEW_TEST_PLAN.md) for the full Decision Review test plan with DB verification.

---

## 12. AI Chat (Per-Project)

| # | Step | Expected | Pass? |
|---|---|---|---|
| 12.1 | Open project → **AI Chat** tab | Chat interface, may have previous messages | ☐ |
| 12.2 | Type a message, send | Streaming response appears word-by-word | ☐ |
| 12.3 | Message persists after page refresh | Chat history loads | ☐ |
| 12.4 | If feedback exists, ask about it | AI references feedback content (RAG) | ☐ |

**Caveat:** RAG retrieval depends on feedback documents being embedded. See [RAG_SMOKE_TEST_PLAN.md](./RAG_SMOKE_TEST_PLAN.md).

---

## 13. AI Assistant (Global)

| # | Step | Expected | Pass? |
|---|---|---|---|
| 13.1 | Click **AI Assistant** in sidebar | Global chat interface | ☐ |
| 13.2 | Ask a general product question | Streaming response | ☐ |
| 13.3 | Messages persist after refresh | Chat history loads | ☐ |

**Important:** The global AI Assistant has **no project context** and **no RAG**. It cannot access any project's feedback. This is by design, not a bug.

---

## 14. Dashboard

| # | Step | Expected | Pass? |
|---|---|---|---|
| 14.1 | Go to `/dashboard` | Stats summary (projects, AI requests, tokens, cost) | ☐ |
| 14.2 | **Recent Projects** section | Shows recent projects with links | ☐ |
| 14.3 | **Recent AI Activity** section | Shows recent AI usage entries (e.g., "Generated PRD", "Decision Review") | ☐ |
| 14.4 | Empty state (new user, no projects) | Shows onboarding guidance or empty cards | ☐ |

**Note:** "Recent AI Activity" shows entries from the `ai_usage` table. "Generated Documents" on the project page shows saved PRDs/analyses from the `decisions` table. These are different concepts.

---

## 15. AI Usage Page

| # | Step | Expected | Pass? |
|---|---|---|---|
| 15.1 | Click **AI Usage** in sidebar | Usage summary page at `/usage` | ☐ |
| 15.2 | Shows monthly totals (requests, tokens, estimated cost) | Numbers match actual usage | ☐ |
| 15.3 | Feature breakdown visible | Shows which features used most | ☐ |

---

## 16. Settings

| # | Step | Expected | Pass? |
|---|---|---|---|
| 16.1 | Click **Settings** in sidebar | Settings page at `/settings` | ☐ |
| 16.2 | **Account Security** section | Shows email, password change option | ☐ |
| 16.3 | **Plan** section | Shows "Free Plan" or "Admin Plan" (if in `ADMIN_EMAILS`) | ☐ |
| 16.4 | **Danger Zone** → Delete Account | Modal confirmation → account deleted → signed out | ☐ |

---

## 17. Landing Page

| # | Step | Expected | Pass? |
|---|---|---|---|
| 17.1 | Visit `/` (not signed in) | Landing page renders, no errors | ☐ |
| 17.2 | Click anchor links (#features, #how-it-works, etc.) | Smooth scroll to section, no full page reload | ☐ |
| 17.3 | Click browser Back after anchor navigation | Returns to previous scroll position, doesn't navigate away | ☐ |
| 17.4 | Sign in / Sign up links work | Navigate to auth pages | ☐ |

---

## 18. Failure Modes (Manual)

| # | Step | Expected | Pass? |
|---|---|---|---|
| 18.1 | Submit decision form with empty title | Validation error shown, form not submitted | ☐ |
| 18.2 | Submit PRD form with description < 10 chars | Validation error | ☐ |
| 18.3 | Visit `/dashboard` while signed out | Redirect to `/sign-in` | ☐ |
| 18.4 | Trigger 6+ heavy AI requests rapidly (non-admin) | 429 rate limit on 6th request | ☐ |
| 18.5 | Run Decision Review with no feedback | Analysis succeeds with lower confidence, empty evidence | ☐ |
| 18.6 | Run Decision Review → Re-Analyze → verify no duplicates | Exactly 1 recommendation, 3-4 options | ☐ |

---

## 19. Mobile Sanity

| # | Step | Expected | Pass? |
|---|---|---|---|
| 19.1 | Open app on mobile viewport (375px) | Layout doesn't break, sidebar collapses | ☐ |
| 19.2 | Navigate between pages | No layout shifts or overflow | ☐ |
| 19.3 | Use AI Chat on mobile | Input works, messages readable | ☐ |

---

## Regression-Sensitive Areas

Areas that have historically had bugs — test these carefully after changes:

| Area | Risk | What to check |
|---|---|---|
| Decision Review cleanup | Duplicate rows | After re-analyze: exactly 1 recommendation, 3-4 options |
| Assumption type normalization | Zod validation failure | AI may return "legal" instead of "business" — normalized automatically |
| Hydration mismatches | Date formatting | Dates should use `suppressHydrationWarning` or `ClientOnlyTime` |
| Auth redirects | Wrong URL | Confirmation/reset links must not redirect to localhost in production |
| RAG false positives | Irrelevant context | Retrieved evidence should actually relate to the query |
| Landing page anchors | History entries | Anchor links should not break browser Back button |

---

## AI Workflow Quick Verification

For each AI feature, verify these 4 things:

1. **Loading state** shown during generation (spinner, "Generating…", etc.)
2. **Output renders** correctly (no raw JSON, no `.slice()` errors, no markdown leakage)
3. **AI Usage tracked** — check `/usage` page or `ai_usage` table
4. **Mock mode works** — with `USE_REAL_AI=false`, deterministic output appears without OpenAI calls
