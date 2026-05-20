# API Overview

ProductMind exposes 14 API route handlers. All are server-side only (never called from client-side JavaScript directly for mutations — they go through `fetch()`).

## Endpoints

### AI Generation Routes

| Endpoint | Method | Rate Limit | Description |
|---|---|---|---|
| `/api/ai/chat` | POST | Standard (20/hr) | Per-project AI chat with RAG context |
| `/api/ai/global-chat` | POST | Standard | Global AI assistant (no project context) |
| `/api/ai/prd` | POST | Heavy (5/15min) | Generate PRD |
| `/api/ai/competitive-analysis` | POST | Heavy | Generate competitive analysis |
| `/api/ai/insights` | POST | Standard | Generate strategic insights |
| `/api/ai/roadmap` | POST | Heavy | Generate prioritized roadmap |
| `/api/ai/roadmap` | DELETE | — | Delete a roadmap |
| `/api/ai/multi-agent-review` | POST | Heavy | Run 4-persona review |
| `/api/ai/prioritize` | POST | Standard | Prioritize features (RICE) |
| `/api/ai/score-features` | POST | Standard | AI-score individual features |

### Decision Engine Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/projects/[projectId]/decisions` | GET | List decisions for project |
| `/api/projects/[projectId]/decisions` | POST | Create a decision |
| `/api/projects/[projectId]/decisions/[decisionId]` | GET | Get decision details |
| `/api/projects/[projectId]/decisions/[decisionId]` | PATCH | Update a decision |
| `/api/projects/[projectId]/decisions/[decisionId]` | DELETE | Delete a decision |
| `/api/projects/[projectId]/decisions/[decisionId]/analyze` | POST | Run AI Decision Review |

### Other Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/decisions` | GET | List legacy decisions (PRDs/analyses) |
| `/api/account/delete` | POST | Delete user account and all data |

## Authentication

Every endpoint requires authentication via Supabase session cookie. The pattern:

```typescript
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

No API keys or bearer tokens — auth is cookie-based via the Supabase Auth session.

## Request/Response Format

**Requests**: JSON body for POST/PATCH. Query parameters for GET filters.

**Responses**: Always JSON. Consistent error shape:
```json
// Success
{ "decision": { ... } }
{ "features": [ ... ] }
{ "id": "...", "content": "..." }

// Error
{ "error": "Human-readable error message" }
```

## Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created (POST that creates a resource) |
| 400 | Invalid input (Zod validation failed) |
| 401 | Not authenticated |
| 404 | Resource not found or not owned by user |
| 429 | Rate limit exceeded (includes `Retry-After` header) |
| 502 | AI service error (OpenAI returned invalid response) |
| 503 | AI service unavailable |

## Validation

All mutating endpoints validate input with Zod schemas:

```typescript
const parsed = createDecisionSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
    { status: 400 }
  );
}
```

## Ownership Verification

Beyond RLS, every query explicitly filters by `user_id`:

```typescript
const { data } = await supabase
  .from("projects")
  .select("id")
  .eq("id", projectId)
  .eq("user_id", user.id)  // explicit ownership
  .single();
```

This provides defense-in-depth — even if RLS has a bug, the application query won't return other users' data.

