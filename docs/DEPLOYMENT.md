# ProductMind — Deployment Guide

## Vercel Environment Variables

Set these in **Vercel → Project Settings → Environment Variables**:

| Variable | Type | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Supabase service role/secret key |
| `OPENAI_API_KEY` | Secret | OpenAI API key |
| `NEXT_PUBLIC_SITE_URL` | Public | `https://your-app.vercel.app` (update after custom domain) |
| `ADMIN_EMAILS` | Secret | Comma-separated admin emails for unlimited AI usage |
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

If you add a custom domain later (e.g. `productmind.app`), add it here too:

```
https://productmind.app/auth/callback
```

---

## Database Migrations

Run these migrations in order via **Supabase SQL Editor**:

1. `000_consolidated.sql` — core tables (projects, feedback, insights, etc.)
2. `001_schema.sql` — additional schema
3. `001_fix_rls_grants.sql` — grants for authenticated/service_role
4. `002_rls.sql` — RLS policies
5. `004_chunk_index.sql` — pgvector chunk index
6. `005_feature_scoring.sql` — feature ideas scoring
7. `006_project_context.sql` — project context table
8. `20260428_create_multi_agent_reviews.sql`
9. `20260428_create_roadmaps.sql`
10. `20260429_create_ai_usage.sql`
11. `20260429_global_chat_messages.sql`
12. `20260504_decision_engine.sql` — Decision Engine product_* tables
13. `20260505_decision_review_hardening.sql` — generated_by columns + triggers

> **Note**: Some migrations may overlap. Run them in a fresh Supabase project. If tables already exist, skip their creation parts.

### Verify Decision Engine tables exist:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'product_%'
ORDER BY table_name;
```

Expected: 7 product_* tables.

### Verify generated_by columns:

```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE column_name = 'generated_by'
AND table_schema = 'public'
ORDER BY table_name;
```

### Verify match_document_chunks RPC:

```sql
SELECT proname, proargtypes::regtype[] FROM pg_proc WHERE proname = 'match_document_chunks';
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
| Heavy | PRD, roadmap, competitive-analysis, multi-agent-review, decision-analyze | 5 requests / 15 minutes |

Rate-limited requests return HTTP 429 with `Retry-After` header.

> **Note**: The rate limiter is in-memory. On Vercel serverless, each function instance has its own memory, so limits are best-effort. For strict enforcement, add Redis/Upstash.

> Admin users (emails in `ADMIN_EMAILS` env var) bypass AI rate limits.

---

## Custom Domain (LH.pl)

### Step 1: Deploy to Vercel first

Deploy without custom domain. Vercel will assign a URL like:
`https://project-mind-xxx.vercel.app`

Set `NEXT_PUBLIC_SITE_URL` to this URL.
Update Supabase Site URL + redirect URLs to match.

### Step 2: Add custom domain in Vercel

Go to **Vercel → Project → Settings → Domains**.
Add your domain, e.g. `productmind.app` or `app.productmind.app`.

Vercel will show required DNS records (typically CNAME or A record).

### Step 3: Update LH.pl DNS

In **LH.pl panel → DNS management**:

- For apex domain (`productmind.app`): add A record pointing to Vercel's IP (76.76.21.21) or ALIAS/ANAME if supported.
- For subdomain (`app.productmind.app`): add CNAME record pointing to `cname.vercel-dns.com`.

### Step 4: Update env vars

After domain is verified:
- Update `NEXT_PUBLIC_SITE_URL` to `https://productmind.app` (or your chosen domain).
- Update Supabase redirect URLs to include the custom domain callback.
- Redeploy.

### Step 5: SSL

Vercel handles SSL automatically. No action needed.

---

## Deployment Checklist

```
□ Set all environment variables in Vercel (see table above)
□ Configure Supabase Auth redirect URLs
□ Verify all database migrations are applied
□ Deploy to Vercel
□ Verify: register → confirm email → login
□ Verify: create project → add feedback → project chat retrieves it
□ Verify: create decision → Analyze Decision → results appear
□ Verify: ai_usage table has rows after AI calls
□ Verify: logout clears session, redirects to landing
□ Verify: /nonexistent shows custom 404 page
□ Verify: rate limit works (non-admin user, repeated AI calls)
□ Monitor Vercel logs for [ENV] startup errors
□ Monitor OpenAI usage dashboard
```

## Post-Deploy Smoke Test

1. **Auth**: Sign up → confirm email → sign in → sign out → sign in again
2. **Projects**: Create project → edit → delete → create again
3. **Feedback**: Add feedback with unique phrase → verify in project chat
4. **AI Chat**: Ask about feedback → verify RAG retrieves it
5. **Decision Engine**: Create decision → Analyze → verify options/assumptions/recommendation
6. **Cross-project**: Verify Project A cannot see Project B feedback
7. **AI Usage**: Check `/usage` shows tracked AI calls
8. **Rate limit**: Trigger 6+ heavy AI requests as non-admin → expect 429
9. **Settings**: Verify profile, plan display, delete account modal

## Rollback

- Vercel supports instant rollback to previous deployment.
- Database changes are NOT automatically rolled back.
- For DB rollback, prepare reverse migration SQL before deploying schema changes.

## Troubleshooting

| Issue | Fix |
|---|---|
| `[ENV] Missing required environment variable` | Add missing env var in Vercel settings |
| `[ENV] Mock auth is not allowed in production` | Set `USE_MOCK_AUTH=false` and `NEXT_PUBLIC_USE_MOCK_AUTH=false` |
| `[ENV] NEXT_PUBLIC_SITE_URL cannot be localhost` | Set to production URL |
| Email confirmation link fails | Check Supabase redirect URLs include `/auth/callback` |
| 401 on AI calls | Verify `OPENAI_API_KEY` is set in Vercel |
| RLS permission denied | Verify Supabase grants migration was applied |
| RAG returns no context | Verify `match_document_chunks` RPC exists with text parameter |
