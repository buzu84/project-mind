# Error Handling

How errors are handled across the API layer, AI services, and frontend.

---

## API Error Structure

Every error response follows the same shape:

```json
{ "error": "Human-readable error message" }
```

Some validation errors include extra detail:

```json
{
  "error": "Validation failed",
  "issues": {
    "title": ["Title must be at least 3 characters."],
    "problem_statement": ["Problem statement must be at least 10 characters."]
  }
}
```

**No stack traces, internal details, or database errors are ever sent to the client.** Error messages are always user-safe.

---

## Status Code Usage

| Code | Meaning | Typical trigger |
|---|---|---|
| `400` | Invalid input | Zod validation failed, missing required query param |
| `401` | Not authenticated | `getCurrentUser()` returned null |
| `404` | Not found | Resource doesn't exist OR user doesn't own it |
| `429` | Rate limited | AI rate limit exceeded |
| `502` | Upstream failure | OpenAI returned error, timeout, or unparseable output |
| `503` | Service unavailable | `OPENAI_API_KEY` not configured and mock mode off |

### Why 404 for ownership failures

When a user requests a resource they don't own, the response is 404 (not 403). This prevents resource enumeration — an attacker can't distinguish "exists but not yours" from "doesn't exist."

---

## Error Sources

### 1. Input Validation (Zod)

Every mutating endpoint validates input before any database or AI call:

```typescript
const parsed = schema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid input" }, { status: 400 });
}
```

AI routes typically return a flat error string. Decision Engine routes return structured `issues` with field-level errors.

**Source files:** Schemas are co-located in route files (AI routes) or in `src/lib/decisions/schemas.ts` (Decision Engine).

### 2. Authentication

```typescript
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

This pattern appears at the top of every route handler. In mock auth mode (`USE_MOCK_AUTH=true`), `getCurrentUser()` always returns the dev user — auth errors are impossible.

### 3. Project Ownership

```typescript
const { data: project } = await supabase
  .from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single();
if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
```

This checks both existence and ownership in one query. If the project exists but belongs to another user, the response is indistinguishable from "not found."

### 4. OpenAI / AI Provider Failures

AI route handlers wrap OpenAI calls in try/catch:

```typescript
try {
  const result = await generateCompletionWithUsage(systemPrompt, userPrompt);
  // ... save and return
} catch (err) {
  void trackAIUsageError({ userId, feature, model, error: err, ... });
  const msg = err instanceof Error ? err.message : "AI request failed";
  console.error("[feature] AI error:", msg);
  return NextResponse.json({ error: `AI error: ${msg}` }, { status: 502 });
}
```

**Error tracking:** Failed AI calls are recorded in `ai_usage` with `status: "error"` and a sanitized error message (API keys stripped via regex in `sanitizeErrorMessage()`).

**Retry for Decision Review:** The Decision Review has a special retry mechanism — if OpenAI returns valid JSON that fails Zod validation, a correction prompt is sent with the specific validation errors. Maximum 1 retry. Other AI routes do not retry.

### 5. Missing API Key

```typescript
if (!process.env.OPENAI_API_KEY) {
  return NextResponse.json(
    { error: "AI is not configured. Set OPENAI_API_KEY or use USE_REAL_AI=false for mock mode." },
    { status: 503 },
  );
}
```

This check only applies in non-mock mode. In production, `isRealAI()` always returns true, so a missing key produces 503.

### 6. Rate Limiting

```typescript
const rl = checkHeavyAILimit(user);
if (!rl.allowed) return rateLimitResponse(rl);
```

The `rateLimitResponse()` function returns:
```
HTTP 429
Retry-After: <seconds>
X-RateLimit-Remaining: 0
{ "error": "Rate limit reached. Please try again later." }
```

### 7. Supabase / Database Failures

Database errors are generally logged and handled gracefully:

```typescript
const { data, error } = await supabase.from("table").insert(row);
if (error) {
  console.error("[feature] DB error:", error.message);
  return NextResponse.json({ error: "..." }, { status: 400 });
}
```

RLS violations appear as permission errors from Supabase. These are caught by the same pattern.

---

## Fallback Behavior

### AI Usage Tracking

Usage tracking is **fire-and-forget** — it uses `void trackAIUsage(...)` so tracking failures never block or fail the user's request. If tracking fails, a `[AI_USAGE_TRACK_ERROR]` message is logged but the AI response is still returned to the user.

### RAG Retrieval

If vector search returns no results or all results are below the quality threshold, the AI proceeds without evidence context. The AI is instructed to acknowledge limited evidence in its response and typically produces a lower confidence score.

### Mock Mode

When `USE_REAL_AI=false`, AI routes return deterministic mock data. No OpenAI calls are made, so OpenAI-related errors are impossible. Mock responses are tracked in `ai_usage` with `is_mock: true` and zero cost.

### Decision Review Save Failure

If the insert-before-delete save fails during Decision Review, old AI-generated records are preserved. The error is returned to the client as 502, but no data is lost.

---

## Frontend Error Propagation

The frontend handles API errors using the standard fetch pattern:

```typescript
const res = await fetch("/api/ai/prd", { method: "POST", body: JSON.stringify(data) });
if (!res.ok) {
  const { error } = await res.json();
  // Show error toast or inline error message
}
```

There is no global error boundary for API errors — each feature handles its own error display. Common patterns:
- Toast notification for transient errors (AI failures, rate limits)
- Inline form errors for validation failures
- Redirect to sign-in for 401s

---

## Logging Strategy

| What | Where | When |
|---|---|---|
| AI errors | `console.error("[feature] AI error:", msg)` | Every AI route catch block |
| Rate limit blocks | `console.warn("[rate-limit] BLOCKED", info)` | On 429 |
| Rate limit allows | `console.log("[rate-limit] allowed", info)` | Only when `DEBUG=true` |
| DB errors | `console.error("[feature] DB error:", msg)` | On Supabase insert/update failures |
| Usage tracking errors | `console.error("[AI_USAGE_TRACK_ERROR]", info)` | When usage tracking itself fails |
| Decision Review diagnostics | `console.log("[decision-review] Evidence stats:", ...)` | Dev mode only |
| Normalization mappings | `console.log("[normalize] assumption.type ...")` | Dev mode only |

**Production logging:** On Vercel, all `console.log/warn/error` output is captured in Vercel Functions logs. There is no structured logging (Sentry, Datadog, etc.) — this is a known limitation documented in [TECHNICAL_DEBT_AND_FUTURE_IMPROVEMENTS.md](../roadmap/TECHNICAL_DEBT_AND_FUTURE_IMPROVEMENTS.md).

---

## Known Limitations

1. **No global error boundary.** Unhandled exceptions in route handlers produce a generic Next.js 500 error. Each handler is responsible for its own try/catch.

2. **No request ID.** Errors cannot be correlated across logs. There is no request ID header or tracing system.

3. **No alerting.** Errors are logged but do not trigger alerts. High error rates would only be noticed by manually checking Vercel logs.

4. **Error messages leak AI model info.** When OpenAI returns an error, the error message (e.g., "Rate limit exceeded" from OpenAI's side) is forwarded to the client as `"AI error: Rate limit exceeded"`. This reveals that OpenAI is the provider. Acceptable for an MVP but should be genericized for a commercial product.

5. **No circuit breaker.** If OpenAI is down, every AI request will attempt the call and fail individually. There is no mechanism to stop trying after repeated failures.

6. **No streaming cancellation handling.** Chat SSE streams (`/api/ai/chat`, `/api/ai/global-chat`) do not handle client disconnection. If the user navigates away mid-stream, the server continues processing the OpenAI response and saves the full message to the database. No partial messages are created, but the OpenAI tokens are consumed regardless.

