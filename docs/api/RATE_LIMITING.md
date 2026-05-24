# Rate Limiting

## Implementation

Rate limiting is implemented in a single file: **`src/lib/ai/rate-limiter.ts`**.

It uses an **in-memory sliding-window** algorithm. There is no Redis, no database, no external service — just a `Map<string, { timestamps: number[] }>` in the Node.js process.

## Tiers and Limits

Two tiers exist. Every AI route calls one of two exported functions:

| Function | Limit | Window | Used by |
|---|---|---|---|
| `checkStandardAILimit(user)` | 20 requests | 1 hour | `chat`, `global-chat`, `insights`, `score-features`, `prioritize` |
| `checkHeavyAILimit(user)` | 5 requests | 15 minutes | `prd`, `competitive-analysis`, `roadmap`, `multi-agent-review`, `decisions/analyze` |

The key is `ai:{userId}` for standard and `ai-heavy:{userId}` for heavy. The two tiers are independent — using up heavy requests does not affect the standard counter.

Non-AI routes (`/api/decisions` CRUD, `/api/account/delete`, `/api/decisions` GET) have **no rate limiting**.

## Admin Bypass

Users whose email appears in the `ADMIN_EMAILS` environment variable bypass all rate limits:

```
ADMIN_EMAILS=admin@example.com,dev@example.com
```

The check is server-side only (`process.env.ADMIN_EMAILS` — no `NEXT_PUBLIC_` prefix). The function `isAdminUser(user)` normalizes emails to lowercase before comparison.

Admin users receive `{ allowed: true, remaining: 999, resetInSeconds: 0 }` without touching the rate limit store.

## Algorithm

```
On each request:
1. Evict timestamps older than windowMs from the user's entry
2. If remaining count ≥ limit → reject
3. Otherwise → push current timestamp, allow
```

Periodic cleanup runs every 5 minutes to prevent memory leaks from inactive users.

## Response When Blocked

```
HTTP 429 Too Many Requests
Content-Type: application/json
Retry-After: 342
X-RateLimit-Remaining: 0

{
  "error": "Rate limit reached. Please try again later."
}
```

The `Retry-After` header contains seconds until the oldest request in the window expires.

## Usage in Route Handlers

Every AI route follows this exact pattern (from actual code):

```typescript
import { checkHeavyAILimit, rateLimitResponse } from "@/lib/ai/rate-limiter";

const rl = checkHeavyAILimit(user);
if (!rl.allowed) return rateLimitResponse(rl);
```

Note: `checkHeavyAILimit` and `checkStandardAILimit` are **synchronous** — they do not return promises. The `await` seen in some older docs was incorrect.

## Known Limitations

### In-memory store on serverless

On Vercel, each serverless function invocation may run in a different container with its own memory. This means:

- **Rate limits do not persist across cold starts.** A function that hasn't been invoked recently starts with a clean slate.
- **Concurrent invocations on different instances don't share state.** A user could theoretically exceed limits by being routed to different instances.
- **Limits are more lenient in practice than on paper.** The 20/hr and 5/15min limits are soft caps, not hard guarantees.

### No per-IP or unauthenticated limiting

Rate limiting only applies to authenticated users. There is no protection against:
- Unauthenticated request floods (mitigated by auth check returning 401 before any expensive work)
- Credential stuffing on auth endpoints (delegated to Supabase's built-in rate limiting)

### Single global store key namespace

Standard and heavy tiers use separate keys (`ai:` vs `ai-heavy:`), so they don't interfere. But there is no per-feature breakdown — all standard-tier routes share the same 20/hr pool.

## Production Upgrade Path

The external API (`checkStandardAILimit` / `checkHeavyAILimit` / `rateLimitResponse`) is designed to be stable. To upgrade:

1. **Replace the `checkRateLimit()` internals** with [Upstash Redis](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) sliding window (`@upstash/ratelimit`).
2. **Or** use a Supabase DB-backed counter (slower but no extra service).
3. The route-level code (`const rl = checkHeavyAILimit(user)`) does not change.

The comment at the top of `rate-limiter.ts` documents this explicitly.

## Logging

Rate limit decisions are logged:
- **Blocked requests** → `console.warn("[rate-limit] BLOCKED", { email, userId, feature, ... })`
- **Allowed requests** → logged only when `DEBUG=true` is set
- **Test environment** → no logging
