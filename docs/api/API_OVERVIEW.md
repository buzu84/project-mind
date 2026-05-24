# API Overview

ProductMind's backend is implemented as **Next.js Route Handlers** in `src/app/api/`. There is no separate backend server — all API routes run as serverless functions on Vercel (or locally via `next dev`).

Every route is a `route.ts` file exporting named functions (`POST`, `GET`, `PATCH`, `DELETE`) that map directly to HTTP methods.

---

## Route Inventory

### AI Generation Routes (`/api/ai/*`)

All AI routes accept `POST` with a JSON body. All require authentication. All track usage to the `ai_usage` table. All support mock mode via `USE_REAL_AI=false`.

| Route | Rate Limit | Response | Backend Calls | Purpose |
|---|---|---|---|---|
| `/api/ai/chat` | Standard | SSE stream | OpenAI streaming, RAG, Supabase | Project-scoped AI chat with conversation history and RAG context |
| `/api/ai/global-chat` | Standard | SSE stream | OpenAI streaming, Supabase | General AI chat without project context |
| `/api/ai/prd` | Heavy | JSON | OpenAI completion, Supabase | Generate a Product Requirements Document |
| `/api/ai/competitive-analysis` | Heavy | JSON | OpenAI completion, Supabase | Generate competitive analysis report |
| `/api/ai/insights` | Standard | JSON | OpenAI (JSON mode), Supabase | Generate 7–12 strategic insights as structured data |
| `/api/ai/roadmap` | Heavy | JSON | OpenAI (JSON mode), RAG, Supabase | Generate a structured Now/Next/Later roadmap |
| `/api/ai/multi-agent-review` | Heavy | JSON | OpenAI ×5, RAG, Supabase | Run 4-persona review (PM, CTO, UX, Growth) + consensus |
| `/api/ai/prioritize` | Standard | JSON | OpenAI completion, Supabase | RICE-prioritize a list of features |
| `/api/ai/score-features` | Standard | JSON | OpenAI (JSON mode), Supabase | Score existing feature ideas with RICE + ICE |

**Streaming vs JSON**: Only `chat` and `global-chat` use Server-Sent Events (SSE). All other AI routes return a single JSON response after the full completion.

**`/api/ai/roadmap`** also exports a `DELETE` handler to delete a saved roadmap by `id` query param.

### Decision Engine Routes (`/api/projects/[projectId]/decisions/*`)

Full CRUD for the product decision engine. All routes require authentication and verify project ownership.

| Route | Method | Rate Limit | Purpose |
|---|---|---|---|
| `/api/projects/[projectId]/decisions` | `GET` | — | List all decisions for a project |
| `/api/projects/[projectId]/decisions` | `POST` | — | Create a new product decision |
| `/api/projects/[projectId]/decisions/[decisionId]` | `GET` | — | Get a single decision with all relations |
| `/api/projects/[projectId]/decisions/[decisionId]` | `PATCH` | — | Update a decision (title, status, context, options, assumptions) |
| `/api/projects/[projectId]/decisions/[decisionId]` | `DELETE` | — | Delete a decision and all child records |
| `/api/projects/[projectId]/decisions/[decisionId]/analyze` | `POST` | Heavy | Run AI-powered decision review (structured analysis, evidence retrieval, multi-agent review) |

Decision CRUD routes delegate to a service layer at `src/lib/decisions/service.ts`. The analyze route delegates to `src/lib/decisions/decision-review-service.ts`.

### Legacy Decision List (`/api/decisions`)

| Route | Method | Purpose |
|---|---|---|
| `/api/decisions` | `GET` | List generated artifacts (PRDs, analyses) by `projectId` and optional `type` query param |

This is a legacy read-only route. PRDs and competitive analyses are stored in the `decisions` table with `type = "PRD" | "COMPETITIVE_ANALYSIS" | "PRIORITIZATION"`.

### Account Routes (`/api/account/*`)

| Route | Method | Purpose |
|---|---|---|
| `/api/account/delete` | `POST` | Permanently delete the authenticated user's account, all projects, and all associated data |

Uses the Supabase service-role (admin) client to cascade-delete all user data across tables, then calls `auth.admin.deleteUser()`.

### Auth Callback (`/app/auth/callback`)

| Route | Method | Purpose |
|---|---|---|
| `/auth/callback` | `GET` | Handle Supabase auth redirects: PKCE code exchange, email confirmation, password reset token verification |

This is not an API in the traditional sense — it's a redirect handler that sets session cookies and redirects to the appropriate page. It is _not_ called by frontend `fetch()`.

---

## Authentication

Every API endpoint (except `/auth/callback`) authenticates using the same pattern:

```typescript
import { getCurrentUser } from "@/lib/auth";

const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

**How it works:**
- `getCurrentUser()` reads the Supabase session from HTTP-only cookies via `@supabase/ssr`.
- In development with `USE_MOCK_AUTH=true`, it returns a hardcoded `DEV_USER` — no Supabase session needed.
- In production, it calls `supabase.auth.getUser()` which validates the JWT server-side.
- There are no API keys or Bearer tokens. Auth is 100% cookie-based.

**Source:** `src/lib/auth/server.ts`

---

## Project Ownership Verification

All project-scoped routes verify that the authenticated user owns the project. This happens at two levels:

### 1. Application-level query filter (defense-in-depth)

AI routes and Decision Engine routes query the project with an explicit `user_id` check:

```typescript
const { data: project } = await supabase
  .from("projects")
  .select("id")
  .eq("id", projectId)
  .eq("user_id", user.id)   // ← ownership check
  .single();
```

**Exception:** The legacy `/api/decisions` GET route filters by `project_id` only and relies on RLS for ownership isolation. It does not perform an explicit `user_id` check at the application level.
if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
```

### 2. Decision Engine service-level check

The decision service layer at `src/lib/decisions/service.ts` verifies ownership before every operation:

```typescript
const result = await getDecisionById(
  { userId: user.id, projectId: params.projectId },
  params.decisionId,
);
```

### 3. Supabase RLS (database-level)

Row-Level Security policies on all tables ensure that even if application code has a bug, users cannot read or write other users' data.

---

## Request / Response Format

**Requests:** JSON body for `POST`/`PATCH`. Query parameters for `GET` filters (`?projectId=...&type=...`).

**Input validation:** All mutating endpoints validate with Zod schemas before any database write:

```typescript
const parsed = schema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid input" }, { status: 400 });
}
```

Some routes return detailed field errors (`issues: parsed.error.flatten().fieldErrors`), others return a flat error string.

**Response shapes:**

```jsonc
// AI generation (PRD, Competitive Analysis, Prioritization)
{ "id": "uuid", "content": "markdown string" }

// AI Insights
{ "insights": [{ "title": "...", "type": "risk", ... }], "saved": 7 }

// AI Roadmap
{ "roadmap": { "title": "...", "now": [...], "next": [...], ... } }

// Decision CRUD
{ "decision": { "id": "...", "title": "...", ... } }
{ "decisions": [{ ... }] }

// Errors (all routes, all status codes)
{ "error": "Human-readable error message" }
```

---

## Status Codes

| Code | When |
|---|---|
| `200` | Success (GET, PATCH, most POST) |
| `201` | Resource created (decision POST) |
| `400` | Zod validation failed, missing required params |
| `401` | No valid session cookie |
| `404` | Resource not found _or_ not owned by user (same response to prevent enumeration) |
| `429` | Rate limit exceeded (includes `Retry-After` header) |
| `502` | OpenAI returned an error or unparseable response |
| `503` | `OPENAI_API_KEY` not set and mock mode is off |

---

## Mock Mode

All AI routes check `isRealAI()` (from `src/lib/ai/is-real-ai.ts`):

- **Production:** Always uses real OpenAI (never mocks).
- **Development with `USE_REAL_AI=false`:** Returns deterministic mock responses. Mock responses are tracked in `ai_usage` with `is_mock: true` and zero cost.
- **Development with `OPENAI_API_KEY` set:** Uses real OpenAI by default.

Each AI feature has its own mock generator (e.g., `src/lib/ai/mock-prd.ts`, `src/lib/ai/mock-roadmap.ts`).

---

## AI Usage Tracking

Every AI route tracks usage to the `ai_usage` table via `trackAIUsage()` from `src/lib/ai/usage-tracking.ts`. Tracking is **fire-and-forget** (`void trackAIUsage(...)`) — it never throws or blocks the response.

Tracked fields: user, project, model, feature name, token counts, estimated cost (from `src/lib/ai/pricing.ts`), latency, mock flag, and error messages (sanitized to strip API keys).

Failed AI calls are tracked via `trackAIUsageError()` with `status: "error"`.

---

## Code Navigation Guide

| Area | Where to look |
|---|---|
| Route handlers | `src/app/api/**/route.ts` |
| Auth helpers | `src/lib/auth/server.ts`, `src/lib/auth/constants.ts` |
| Supabase clients | `src/lib/supabase/server.ts` (server + service-role admin), `src/lib/supabase/client.ts` (browser) |
| OpenAI wrapper | `src/lib/openai.ts` |
| Rate limiting | `src/lib/ai/rate-limiter.ts` |
| Usage tracking | `src/lib/ai/usage-tracking.ts`, `src/lib/ai/pricing.ts` |
| RAG pipeline | `src/lib/rag/` (vector-search, context-builder, ingest, embeddings, chunker) |
| Evidence layer | `src/lib/evidence/` (retrieval-service, citations) |
| Decision service | `src/lib/decisions/service.ts`, `src/lib/decisions/schemas.ts` |
| Decision AI review | `src/lib/decisions/decision-review-service.ts` |
| Mock AI generators | `src/lib/ai/mock-*.ts` |
| Input validation schemas | Co-located in each route file or `src/lib/decisions/schemas.ts` |
