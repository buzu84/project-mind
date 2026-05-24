# ProductMind — Environment Variables Reference

All environment variables actually used by the application, verified against source code.

---

## Required Variables

### `NEXT_PUBLIC_SUPABASE_URL`

| Property | Value |
|---|---|
| Required | Yes |
| Prefix | `NEXT_PUBLIC_` (exposed to client) |
| Used in | `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`, `src/app/auth/callback/route.ts` |
| Format | `https://<project-ref>.supabase.co` |
| What breaks if missing | App throws `[ENV] Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL` at startup |
| Dev behavior | Can point to a real Supabase project or be set to a placeholder if using `USE_MOCK_DB=true` |
| Security | Public — safe to expose. This is the project URL, not a secret. |

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

| Property | Value |
|---|---|
| Required | Yes (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as alias) |
| Prefix | `NEXT_PUBLIC_` (exposed to client) |
| Used in | `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`, `src/app/auth/callback/route.ts` |
| Format | `eyJ...` (JWT) |
| What breaks if missing | App throws `[ENV] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Security | Public — this key only grants access through RLS policies. Not a secret, but scope-limited. |

> **Alias**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the app checks both names. Supabase dashboard may label this as "publishable" in newer versions.

### `SUPABASE_SERVICE_ROLE_KEY`

| Property | Value |
|---|---|
| Required | Yes (or `SUPABASE_SECRET_KEY` as alias) |
| Prefix | None (server-only) |
| Used in | `src/lib/supabase/server.ts` (dev mode admin client), `src/app/api/account/delete/route.ts` (account deletion) |
| Format | `eyJ...` (JWT) |
| What breaks if missing | App throws `[ENV] Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY`; account deletion fails |
| Dev behavior | Used as admin client in mock-auth dev mode to bypass RLS |
| Security | **SECRET** — bypasses all RLS. Never expose via `NEXT_PUBLIC_` prefix. Store in Vercel as a secret variable. |

### `OPENAI_API_KEY`

| Property | Value |
|---|---|
| Required | Yes |
| Prefix | None (server-only) |
| Used in | `src/lib/openai.ts`, `src/lib/env.ts` (validation) |
| Format | `sk-...` |
| What breaks if missing | App throws `[ENV] Missing required environment variable: OPENAI_API_KEY`; all AI features fail |
| Dev behavior | Not needed if `USE_REAL_AI=false` (mock responses used), but env validation still requires it to be set |
| Security | **SECRET** — the error sanitizer (`src/lib/errors.ts`) redacts any leaked `sk-` prefixed strings from error messages |

### `NEXT_PUBLIC_SITE_URL`

| Property | Value |
|---|---|
| Required | Yes |
| Prefix | `NEXT_PUBLIC_` (exposed to client) |
| Used in | `src/lib/url.ts` (getSiteUrl), `src/lib/env.ts` (validation) |
| Format | `http://localhost:3000` (dev) or `https://your-app.vercel.app` (production) |
| What breaks if missing | App throws `[ENV] Missing required environment variable: NEXT_PUBLIC_SITE_URL`; auth callback redirects fail |
| Production guard | If contains `localhost` or `127.0.0.1` in production, app throws `[ENV] NEXT_PUBLIC_SITE_URL cannot be localhost in production` |
| Security | Public. Must match what's configured in Supabase Auth redirect URLs. |

---

## Development Flags

### `NEXT_PUBLIC_USE_MOCK_AUTH`

| Property | Value |
|---|---|
| Required | No (defaults to not using mock auth) |
| Used in | `src/lib/auth/constants.ts` (isDevMode), `src/lib/supabase/middleware.ts` |
| Values | `"true"` / `"false"` or unset |
| Dev behavior | When `"true"` + `NODE_ENV=development`: skips Supabase session checks, uses hardcoded `DEV_USER` |
| Production guard | If `"true"` in production, app throws `[ENV] Mock auth is not allowed in production` |
| Security | Has `NEXT_PUBLIC_` prefix so client components can detect mock mode |

### `USE_MOCK_AUTH`

| Property | Value |
|---|---|
| Required | No |
| Used in | `src/lib/auth/constants.ts`, `src/lib/supabase/middleware.ts`, `src/lib/supabase/server.ts`, `src/lib/env.ts` |
| Values | `"true"` / `"false"` or unset |
| Behavior | Server-side equivalent of `NEXT_PUBLIC_USE_MOCK_AUTH`. Both are checked. |
| Production guard | Same as `NEXT_PUBLIC_USE_MOCK_AUTH` |
| Note | Set **both** `USE_MOCK_AUTH` and `NEXT_PUBLIC_USE_MOCK_AUTH` to the same value to avoid server/client mismatch |

### `USE_MOCK_DB`

| Property | Value |
|---|---|
| Required | No (defaults to real DB) |
| Used in | `src/lib/auth/constants.ts` (isMockDb), `src/lib/supabase/server.ts` |
| Values | `"true"` / `"false"` or unset |
| Dev behavior | When `"true"` + `NODE_ENV=development`: uses in-memory mock Supabase client (data is lost on server restart, survives HMR) |
| Production guard | If `"true"` in production, app throws `[ENV] Mock DB is not allowed in production` |

### `USE_REAL_AI`

| Property | Value |
|---|---|
| Required | No (defaults to real AI if `OPENAI_API_KEY` is set) |
| Used in | `src/lib/ai/is-real-ai.ts` |
| Values | `"true"` / `"false"` or unset |
| Dev behavior | `"false"`: all AI features return deterministic mock responses; no OpenAI API calls made |
| Production guard | `"false"` in production throws `[ENV] USE_REAL_AI=false is not allowed in production` |

---

## Optional Variables

### `ADMIN_EMAILS`

| Property | Value |
|---|---|
| Required | No |
| Prefix | None (server-only) |
| Used in | `src/lib/ai/rate-limiter.ts` (isAdminUser, getAdminEmails) |
| Format | Comma-separated emails: `admin@example.com,another@example.com` |
| Behavior | Listed emails bypass all AI rate limits. Matching is case-insensitive, trimmed. |
| What breaks if missing | Nothing — all users subject to standard rate limits |
| Security | Server-only. Never exposed to client. Admin status is determined server-side from the Supabase session email. |

### `NEXT_PUBLIC_VERCEL_URL`

| Property | Value |
|---|---|
| Required | No (auto-set by Vercel) |
| Used in | `src/lib/url.ts` (getSiteUrl fallback) |
| Format | `project-name-xxx.vercel.app` (no protocol prefix) |
| Behavior | Used as fallback when `NEXT_PUBLIC_SITE_URL` is not set. The app prepends `https://`. Useful for Vercel preview deployments. |
| Note | Auto-injected by Vercel — do not set manually |

### `DEBUG`

| Property | Value |
|---|---|
| Required | No |
| Used in | `src/lib/ai/rate-limiter.ts` |
| Behavior | When set (any truthy value), rate limiter logs "allowed" decisions in addition to "blocked" ones |

---

## Build-Time Variables

### `NEXT_PHASE`

| Property | Value |
|---|---|
| Set by | Next.js internally during `next build` |
| Used in | `src/lib/env.ts` |
| Behavior | When `"phase-production-build"`, production safety guards (mock check, localhost check) are skipped. This prevents build failures when env vars point to localhost. |

### `NODE_ENV`

| Property | Value |
|---|---|
| Set by | Next.js (`"development"` / `"production"` / `"test"`) |
| Used in | Many files — controls mock mode eligibility, production guards, logging verbosity |

---

## Variables NOT Used by This App

The following are sometimes assumed but **do not exist** in the codebase:

- `DATABASE_URL` — not used; all DB access goes through Supabase client libraries
- `SUPABASE_JWT_SECRET` — not used; auth is handled by Supabase client SDK
- `NODE_TLS_REJECT_UNAUTHORIZED` — not used anywhere in the codebase
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` — not used; app uses Supabase Auth, not NextAuth
- `VERCEL_ENV` — not read by application code (though Vercel sets it automatically)

---

## Quick Reference: Production Deployment

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# Required for production (these values)
NEXT_PUBLIC_USE_MOCK_AUTH=false
USE_MOCK_AUTH=false
USE_MOCK_DB=false
USE_REAL_AI=true

# Optional
ADMIN_EMAILS=admin@example.com
```

## Quick Reference: Full Mock Development

```env
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
SUPABASE_SERVICE_ROLE_KEY=placeholder
OPENAI_API_KEY=sk-placeholder
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_USE_MOCK_AUTH=true
USE_MOCK_AUTH=true
USE_MOCK_DB=true
USE_REAL_AI=false
```

