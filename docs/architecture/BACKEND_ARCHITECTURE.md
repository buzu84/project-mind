# Backend Architecture

## Overview

ProductMind's backend is implemented as Next.js API Route Handlers in `src/app/api/` with a modular service layer in `src/lib/`. This document explains the patterns, conventions, and design rationale for a developer coming from a frontend background.

## API Route Handlers

Next.js Route Handlers are server-side functions that receive HTTP requests and return responses. They are functionally equivalent to Express.js route handlers but colocated with the frontend code.

**Location**: `src/app/api/[...path]/route.ts`

**Convention**: Each file exports named functions matching HTTP methods:
```typescript
export async function GET(req: Request) { ... }
export async function POST(req: Request) { ... }
export async function PATCH(req: Request) { ... }
export async function DELETE(req: Request) { ... }
```

### Common Pattern (every AI route)

```typescript
export async function POST(req: Request) {
  // 1. Authentication
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Rate limiting (synchronous — no await needed)
  const rl = checkHeavyAILimit(user);
  if (!rl.allowed) return rateLimitResponse(rl);

  // 3. Input validation (Zod)
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // 4. Authorization (ownership check via RLS + explicit query)
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)  // ownership check
    .single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 5. Business logic (AI call, DB operations, etc.)
  // ...

  // 6. Usage tracking (non-blocking)
  void trackAIUsage({ userId, feature, tokens, ... });

  // 7. Structured response
  return NextResponse.json({ result }, { status: 200 });
}
```

## Service Layer (`src/lib/`)

The service layer contains reusable backend logic separated from HTTP concerns. Route handlers are thin — they validate, authorize, then delegate to services.

### Module Boundaries

| Module | Responsibility | Key Files |
|---|---|---|
| `lib/ai/` | Rate limiting, usage tracking, pricing config, mock detection | `rate-limiter.ts`, `usage-tracking.ts`, `pricing.ts` |
| `lib/auth/` | User session management, admin detection, mock auth | `server.ts`, `constants.ts`, `client.ts` |
| `lib/decisions/` | Decision CRUD, AI review orchestration, schema validation | `service.ts`, `decision-review-service.ts`, `review-schemas.ts`, `review-normalize.ts` |
| `lib/evidence/` | Evidence retrieval abstraction, citation generation | `retrieval-service.ts`, `citations.ts`, `types.ts` |
| `lib/rag/` | Document chunking, embedding, vector search, context building | `chunker.ts`, `embeddings.ts`, `vector-search.ts`, `context-builder.ts` |
| `lib/supabase/` | Database client creation (server/client/middleware) | `server.ts`, `client.ts`, `middleware.ts` |

### Why Not Express/Fastify?

Next.js Route Handlers provide the same capabilities (request parsing, response building, middleware) while keeping the codebase unified. For an MVP, this eliminates the overhead of separate API deployment, CORS configuration, and service discovery.

## Authentication Flow

Every request passes through Edge Middleware (session refresh) → `getCurrentUser()` → RLS enforcement. See [AUTH_AND_SECURITY.md](AUTH_AND_SECURITY.md) for the full session flow and [AUTH_FLOW.md](../api/AUTH_FLOW.md) for step-by-step API details.

## Rate Limiting

Two tiers: Standard (20/hour) and Heavy (5/15min). In-memory sliding window with admin bypass. See [RATE_LIMITING.md](../api/RATE_LIMITING.md) for the full reference.

## Usage Tracking

Every AI operation records telemetry to the `ai_usage` table via `trackAIUsage()`:

```typescript
void trackAIUsage({
  userId,
  projectId,
  model: "gpt-4o",
  feature: "decision_review",
  promptTokens: 1500,
  completionTokens: 800,
  isMock: false,
  latencyMs: 3200,
  metadata: { decisionId, evidenceCount, confidenceScore },
});
```

The `void` prefix makes tracking non-blocking — if tracking fails, the user's request still succeeds.

## Error Handling

All errors return `{ "error": "Human-readable message" }`. Status codes: 400 (validation), 401 (auth), 404 (not found/not owned), 429 (rate limit), 502 (OpenAI failure), 503 (not configured). See [ERROR_HANDLING.md](ERROR_HANDLING.md) for the full reference.

## Structured AI Output Handling

AI responses (especially Decision Review) go through a validation pipeline:

```
OpenAI JSON response
    → JSON.parse()
    → normalizeDecisionReviewOutput()  // snake_case → camelCase, type aliases, string→number
    → decisionReviewOutputSchema.safeParse()  // Zod validation
    → if invalid: retry with correction prompt (max 1 retry)
    → sanitizeCitationIds()  // remove hallucinated citation references
    → save to database
```

This is necessary because LLMs don't reliably produce valid JSON matching a specific schema. The normalization layer handles common AI output variations so the Zod schema can be strict.

## Environment & Config

- `lib/env.ts`: Validates required environment variables at startup. Blocks production deployment with `localhost` URLs.
- `lib/ai/is-real-ai.ts`: Checks `USE_REAL_AI` flag to toggle mock/real AI.
- `lib/auth/constants.ts`: Guards mock auth flags so they can never activate in production.
- `lib/url.ts`: `getSiteUrl()` resolves the correct URL for Vercel preview, production, or local dev.

