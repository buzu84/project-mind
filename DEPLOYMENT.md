# ProductMind — Deployment Guide

## Vercel Environment Variables

Set these in **Vercel → Project Settings → Environment Variables**:

| Variable | Type | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Supabase service role/secret key |
| `OPENAI_API_KEY` | Secret | OpenAI API key |
| `NEXT_PUBLIC_SITE_URL` | Public | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_USE_MOCK_AUTH` | Public | `false` |
| `USE_MOCK_AUTH` | Secret | `false` |
| `USE_MOCK_DB` | Secret | `false` |
| `USE_REAL_AI` | Secret | `true` |

> **Important**: `NEXT_PUBLIC_SITE_URL` must be your production domain (not `localhost`). The app will refuse to start if set to localhost in production.

---

## Supabase URL Configuration

Go to **Supabase Dashboard → Authentication → URL Configuration** and set:

### Site URL

```
https://your-app.vercel.app
```

### Redirect URLs

```
https://your-app.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

Replace `your-app.vercel.app` with your actual Vercel deployment domain.

If you add a custom domain later (e.g. `app.productmind.com`), add it here too:

```
https://app.productmind.com/auth/callback
```

---

## Production Safety Guards

The app enforces these at runtime in production (`NODE_ENV=production`):

- `USE_MOCK_AUTH=true` → throws fatal error
- `USE_MOCK_DB=true` → throws fatal error
- `USE_REAL_AI=false` → throws fatal error
- `NEXT_PUBLIC_SITE_URL` containing `localhost` → throws fatal error
- Missing required env vars → throws with clear error message

---

## AI Rate Limits

All AI routes are rate-limited per authenticated user:

| Tier | Routes | Limit |
|---|---|---|
| Standard | chat, global-chat, insights, prioritize, score-features | 20 requests / hour |
| Heavy | PRD, roadmap, competitive-analysis, multi-agent-review | 5 requests / 15 minutes |

Rate-limited requests return HTTP 429 with `Retry-After` header.

> **Note**: The rate limiter is in-memory. On Vercel serverless, each function instance has its own memory, so limits are best-effort. For strict enforcement, add Redis/Upstash.

---

## Deployment Checklist

```
□ Set all environment variables in Vercel
□ Configure Supabase Auth redirect URLs (see above)
□ Run database migrations (supabase/migrations/*.sql)
□ Deploy to Vercel
□ Verify: register → confirm email → login → create project → generate AI
□ Verify: logout clears session, redirects to landing
□ Verify: /nonexistent shows custom 404 page
□ Monitor Vercel logs for [ENV] startup errors
□ Monitor OpenAI usage dashboard
```

