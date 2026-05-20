# Manual Testing Guide

## Pre-Deployment Smoke Tests

### Authentication
- [ ] Sign up with email → receive confirmation email → confirm → redirected to dashboard
- [ ] Sign in with valid credentials → dashboard loads
- [ ] Sign in with invalid credentials → error message shown
- [ ] Sign out → redirected to sign-in page
- [ ] Access `/dashboard` while logged out → redirected to sign-in
- [ ] Password reset flow sends email and allows reset

### Project Management
- [ ] Create a new project with all fields → project appears in list
- [ ] Edit project details → changes persist after refresh
- [ ] Delete project → project removed, data cleaned up
- [ ] Project detail page loads with all sections

### Decision Engine
- [ ] Create a new decision → appears in decisions list
- [ ] Edit decision title/status → changes persist
- [ ] Delete decision → removed from list
- [ ] Click "Analyze Decision" → loading state shown → results appear
- [ ] Re-analyze same decision → old results replaced, no duplicates
- [ ] Verify assumption type badges render correctly
- [ ] Verify reversibility badges render on options (hidden when "unknown")

### AI Features
- [ ] Generate PRD → output saved, viewable on detail page
- [ ] Generate Competitive Analysis → output saved
- [ ] Generate AI Insights → insight cards appear
- [ ] Generate AI Roadmap → roadmap renders
- [ ] Run Multi-Agent Review → 4 perspectives + consensus shown
- [ ] Score features (AI Score All) → scores populate table
- [ ] AI Chat (per-project) → messages exchange, persist on refresh
- [ ] Global AI Assistant → general chat works, no project context claimed

### RAG / Evidence
- [ ] Upload feedback document → chunks created
- [ ] Run Decision Review with uploaded evidence → evidence section shows relevant chunks
- [ ] Run Decision Review without evidence → analysis still works, lower confidence

### Dashboard
- [ ] Stats show real data (projects, AI requests, tokens, cost)
- [ ] "Recent AI Activity" shows recent AI actions (not internal events)
- [ ] "Recent Projects" links to project pages
- [ ] "View all →" links work correctly
- [ ] Empty states render for new users

### Rate Limiting
- [ ] Trigger rate limit → 429 response with retry time
- [ ] Admin user bypasses rate limit

## Regression-Sensitive Areas

These areas have historically had bugs and should be tested carefully:

| Area | Risk | What to check |
|---|---|---|
| Decision Review cleanup | Duplicate rows | After re-analyze, verify exactly 1 recommendation per decision |
| Assumption type normalization | Zod validation failure | AI may return "legal" instead of "business" |
| Hydration mismatches | Date formatting | Dates should use `suppressHydrationWarning` |
| Auth redirects | Wrong URL | Sign-up confirmation and password reset should not redirect to localhost |
| RAG false positives | Irrelevant context | Check that retrieved evidence is actually related to the query |

## AI Workflow Verification

For each AI feature, verify:
1. Loading/progress state shown during generation
2. Output renders correctly (no raw JSON, no `.slice()` crashes)
3. AI Usage tracking records the action (check `/usage` page)
4. Mock mode (`USE_REAL_AI=false`) produces deterministic output
5. Error state handles gracefully (network error, AI timeout)

