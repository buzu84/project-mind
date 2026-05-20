# Rate Limiting

## Overview

All AI endpoints are rate-limited to prevent abuse and control OpenAI API costs. The rate limiter is implemented in `src/lib/ai/rate-limiter.ts`.

## Tiers

| Tier | Limit | Window | Applies to |
|---|---|---|---|
| **Standard** | 20 requests | 1 hour | AI Chat, Global Chat, Insights, Feature Scoring, Prioritization |
| **Heavy** | 5 requests | 15 minutes | PRD Generator, Roadmap, Competitive Analysis, Decision Review, Multi-Agent Review |

## Algorithm

**Sliding window**: Each user has an array of timestamps. On each request:
1. Remove timestamps older than the window
2. Count remaining timestamps
3. If count ≥ limit → reject with 429
4. Otherwise → add current timestamp, allow request

## Admin Bypass

Users whose email appears in the `ADMIN_EMAILS` environment variable skip rate limiting entirely. This is checked server-side only — the env var is never exposed to the client.

```
ADMIN_EMAILS=admin@example.com,dev@example.com
```

## Response on Rate Limit

```json
HTTP 429 Too Many Requests
Retry-After: 342

{
  "error": "Rate limit exceeded. Try again in 6 minutes.",
  "retryAfter": 342
}
```

## Usage in Routes

```typescript
import { checkHeavyAILimit, rateLimitResponse } from "@/lib/ai/rate-limiter";

const rl = await checkHeavyAILimit(user, "decision_review");
if (!rl.allowed) return rateLimitResponse(rl);
```

## Known Limitation

The rate limiter uses **in-memory storage**. On Vercel serverless, each function instance has its own memory. This means:
- Rate limits reset on cold start
- Different function instances don't share state
- A user could theoretically exceed limits by hitting different instances

**Acceptable for MVP/demo usage.** For production scale, upgrade to Redis/Upstash.

