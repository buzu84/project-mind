# ProductMind — Observability

Current observability posture: **MVP-level, log-based, manual inspection**.

There is no centralized logging, no metrics dashboard (beyond AI usage tracking), no alerting, no distributed tracing, and no automated error monitoring.

---

## Where Logs Are Emitted

All logging uses `console.log`, `console.warn`, and `console.error`. On Vercel, these appear in **Vercel → Project → Logs** (real-time and recent).

### Log Prefixes and Sources

| Prefix | File(s) | Level | Environment | What it reports |
|---|---|---|---|---|
| `[ENV]` | `src/lib/env.ts` | error (throws) | All | Missing or invalid environment variables at startup |
| `[rate-limit] BLOCKED` | `src/lib/ai/rate-limiter.ts` | warn | Dev + Prod | User hit rate limit (includes userId, email, feature, remaining) |
| `[rate-limit] allowed` | `src/lib/ai/rate-limiter.ts` | log | Dev only (requires `DEBUG` env var) | Rate limit check passed |
| `[AI_USAGE_TRACK_ERROR]` | `src/lib/ai/usage-tracking.ts` | error | All | Failed to insert usage row into `ai_usage` table |
| `[supabase] DEV MODE` | `src/lib/supabase/server.ts` | log | Dev only (mock auth) | Confirms service-role client is being used |
| `[supabase] No real credentials` | `src/lib/supabase/server.ts` | warn | Prod (misconfigured) | Supabase credentials missing — falling back to mock |
| `[rag]` | `src/lib/rag/vector-search.ts`, `context-builder.ts`, `ingest.ts` | mixed | All | Vector search diagnostics, quality filter results, chunk storage failures |
| `[decision-review]` | `src/lib/decisions/decision-review-service.ts` | log/error | Dev only (most) | Phase progress, JSON parse failures, Zod validation errors, DB insert failures |
| `[normalize]` | `src/lib/decisions/review-normalize.ts` | log | Dev only | Assumption type mapping during normalization |
| `[insights]` | `src/app/api/ai/insights/route.ts` | error | All | Insight insert errors, AI call failures |
| `[roadmap]` | `src/app/api/ai/roadmap/route.ts` | error | All | Parse failures, insert failures, AI errors |
| `[chat]` | `src/app/api/ai/chat/route.ts` | warn | All | No RAG context found for project |
| `[prd]` | `src/app/api/ai/prd/route.ts` | error | All | AI call failures |
| `[competitive-analysis]` | `src/app/api/ai/competitive-analysis/route.ts` | error | All | AI call failures |
| `[multi-agent]` | `src/app/api/ai/multi-agent-review/route.ts` | error | All | Insert failures, AI errors |
| `[score-features]` | `src/app/api/ai/score-features/route.ts` | error | All | Parse failures, AI errors |
| `[prioritize]` | `src/app/api/ai/prioritize/route.ts` | error | All | AI errors |
| `[decisions]` | `src/app/api/decisions/route.ts` | error | All | Fetch failures |
| `[DELETE_ACCOUNT]` | `src/app/api/account/delete/route.ts` | error | All | Account deletion failures (per-table) |
| `[projects]` | `src/app/(dashboard)/projects/actions.ts` | error | All | Project CRUD failures |
| `[GlobalError]` | `src/app/error.tsx` | error | All | Unhandled client-side errors |

### Dev-Only vs Production Logs

**Dev-only** (never appear in Vercel production logs):
- `[rate-limit] allowed` — requires `DEBUG` env var
- `[supabase] DEV MODE` — only when `isDevMode()` returns true
- `[decision-review]` phase progress logs — gated by `isDev` check
- `[decision-review]` JSON parse/Zod validation errors — gated by `isDev`
- `[decision-review]` DB insert failure details — gated by `isDev`
- `[normalize]` assumption mapping logs — gated by `isDev`

**Always present in production**:
- All `console.error` calls (AI failures, DB insert errors, account deletion errors)
- `[rate-limit] BLOCKED` warnings
- `[AI_USAGE_TRACK_ERROR]` errors
- `[rag]` diagnostics (vector search summary on every search)

---

## AI Usage Tracking

The most structured observability in the app. Every AI call is recorded in the `ai_usage` Supabase table.

### What is tracked

| Column | Description |
|---|---|
| `user_id` | Who made the request |
| `project_id` | Which project (null for global chat) |
| `provider` | Always `"openai"` currently |
| `model` | e.g., `"gpt-4o"` |
| `feature` | One of: `chat`, `insights`, `roadmap`, `multi_agent_review`, `feature_prioritization`, `prd`, `competitive_analysis`, `decision_review`, `document_embedding`, `query_embedding`, `rag_search`, `other` |
| `prompt_tokens` | Input tokens consumed |
| `completion_tokens` | Output tokens consumed |
| `total_tokens` | Sum of prompt + completion |
| `input_cost` | Estimated USD cost for input tokens |
| `output_cost` | Estimated USD cost for output tokens |
| `estimated_cost` | Total estimated USD cost |
| `is_mock` | Whether mock AI was used |
| `status` | `"success"`, `"error"`, `"skipped"` |
| `error_message` | Sanitized error (API keys redacted) |
| `latency_ms` | Request duration |
| `created_at` | Timestamp |

### Where to view

- **In-app**: `/usage` page shows monthly summary (total requests, tokens, cost, top feature)
- **Supabase Dashboard**: Query `ai_usage` table directly for detailed analysis

### Useful queries

```sql
-- Total cost this month
SELECT SUM(estimated_cost) FROM ai_usage
WHERE created_at >= date_trunc('month', now()) AND status = 'success';

-- Cost by feature
SELECT feature, COUNT(*), SUM(estimated_cost) FROM ai_usage
WHERE created_at >= date_trunc('month', now()) AND status = 'success'
GROUP BY feature ORDER BY sum DESC;

-- Error rate by feature
SELECT feature, COUNT(*) FILTER (WHERE status = 'error') AS errors,
       COUNT(*) AS total
FROM ai_usage WHERE created_at >= date_trunc('month', now())
GROUP BY feature;

-- Slowest AI calls
SELECT feature, model, latency_ms, created_at FROM ai_usage
WHERE latency_ms IS NOT NULL ORDER BY latency_ms DESC LIMIT 20;
```

### Pricing accuracy

Cost estimates use hardcoded model pricing in `src/lib/ai/pricing.ts`. These are approximate as of April 2026. If OpenAI changes pricing, the file must be updated manually. Fallback pricing ($5/$15 per 1M tokens) is used for unknown models.

---

## Rate Limit Visibility

- **Blocked requests**: Logged as `[rate-limit] BLOCKED` with user info (visible in Vercel logs)
- **429 responses**: Clients receive HTTP 429 with `Retry-After` and `X-RateLimit-Remaining: 0` headers
- **No dashboard**: There is no rate limit dashboard. To check who is being rate-limited, search Vercel logs for `[rate-limit] BLOCKED`.
- **In-memory only**: Rate limit state is per serverless instance. There is no way to query current rate limit counters across instances.

---

## What Can Be Debugged from Vercel Logs

- Startup failures (`[ENV]` errors)
- AI API call failures (all features log on error)
- Rate limit blocks
- RAG retrieval quality (vector search summaries)
- Account deletion issues
- HTTP status codes and response times (Vercel built-in)

## What Can Be Debugged from Supabase Dashboard

- Data integrity (query any table)
- AI usage patterns (query `ai_usage`)
- Auth issues (Authentication → Users tab)
- RLS policy violations (show up as permission denied errors)
- Migration status (check `information_schema.tables` and `information_schema.columns`)
- Edge function logs (if any Supabase Edge Functions are used — currently none)

---

## What Is NOT Currently Observable

| Gap | Impact | Workaround |
|---|---|---|
| No centralized logging | Logs are only in Vercel's built-in log viewer (limited retention) | Search Vercel logs manually; consider Vercel Log Drains for persistence |
| No metrics dashboard | Can't visualize request rates, error rates, latency trends | Query `ai_usage` table for AI-specific metrics |
| No alerting | Won't know about failures until a user reports them | Monitor Vercel logs and OpenAI usage dashboard manually |
| No distributed tracing | Can't trace a request across middleware → route → service → Supabase | Add request IDs to logs manually if needed |
| No automated error monitoring | No Sentry, Datadog, or equivalent | Client-side `error.tsx` catches React errors; server errors are in Vercel logs |
| No uptime monitoring | No synthetic checks | Set up external ping (e.g., UptimeRobot) against the landing page |
| No OpenAI spend alerts | Could run up unexpected costs | Check OpenAI usage dashboard; set spending limits in OpenAI account |
| Rate limit state not durable | Serverless cold starts reset in-memory counters | Acceptable for MVP; upgrade to Redis/Upstash for strict enforcement |
| Decision Review phase logging is dev-only | Can't debug Decision Review failures in production from logs alone | Check `ai_usage` table for `decision_review` errors; reproduce locally |

---

## Future Improvements

- **Vercel Log Drains** → pipe logs to a persistent store (e.g., Axiom, Datadog)
- **Sentry** → automated error tracking with stack traces and user context
- **Upstash Redis** → durable rate limiting + queryable rate limit state
- **OpenAI spend alerts** → configure at platform.openai.com
- **Structured JSON logging** → replace `console.*` with a logger that emits JSON for easier parsing
- **Request ID propagation** → add `x-request-id` header in middleware, include in all log lines
- **Health check endpoint** → `/api/health` that checks Supabase connectivity and OpenAI key validity

