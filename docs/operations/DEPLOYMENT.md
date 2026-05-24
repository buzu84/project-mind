# ProductMind — Deployment Guide

Covers local development setup, Vercel deployment, Supabase configuration, and migration management.

For environment variable details, see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md).
For incident troubleshooting, see [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md).

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| npm | 9+ | Package manager |
| Git | any | Version control |
| Supabase account | Free tier works | Database + Auth |
| OpenAI account | API access required | AI features (GPT-4o + embeddings) |
| Vercel account | Free tier works | Hosting |

---

## Local Development Setup

### 1. Clone and install

```bash
git clone <repo-url> && cd project-mind
npm install
```

### 2. Create `.env.local`

Copy from the example or create manually:

```env
# Supabase (get from Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (get from platform.openai.com → API Keys)
OPENAI_API_KEY=sk-...

# App URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Development flags
NEXT_PUBLIC_USE_MOCK_AUTH=true
USE_MOCK_AUTH=true
USE_MOCK_DB=false
USE_REAL_AI=false

# Optional: admin email for unlimited AI usage
ADMIN_EMAILS=your-email@example.com
```

### 3. Choose a development mode

| Mode | Flags | What you need |
|---|---|---|
| **Full mock** (no external services) | `USE_MOCK_AUTH=true`, `USE_MOCK_DB=true`, `USE_REAL_AI=false` | Nothing — placeholder env values are fine |
| **Mock auth + real DB** | `USE_MOCK_AUTH=true`, `USE_MOCK_DB=false`, `USE_REAL_AI=false` | Supabase project with migrations applied |
| **Mock auth + real AI** | `USE_MOCK_AUTH=true`, `USE_MOCK_DB=true`, `USE_REAL_AI=true` | Valid `OPENAI_API_KEY` |
| **Full real** | `USE_MOCK_AUTH=false`, `USE_MOCK_DB=false`, `USE_REAL_AI=true` | Supabase project + OpenAI key + real email for auth |

### 4. Start the dev server

```bash
npm run dev
# → http://localhost:3000
```

In mock auth mode, you're automatically signed in as `dev@productmind.app`.

---

## Supabase Setup

### Create a project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to your Vercel deployment region
3. Save the project URL and keys from Settings → API

### Enable pgvector

The pgvector extension is required for RAG/embeddings. It should be enabled by the consolidated migration, but verify:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Configure Auth URLs

Go to **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (development) or `https://your-app.vercel.app` (production)
- **Redirect URLs**:
  ```
  http://localhost:3000/auth/callback
  https://your-app.vercel.app/auth/callback
  ```

The auth callback route (`src/app/auth/callback/route.ts`) handles both PKCE/OAuth code exchange and email link token verification (signup confirmation, password reset).

---

## Database Migrations

All migrations are in `supabase/migrations/`. Run them in order via **Supabase Dashboard → SQL Editor**.

### Migration order

| # | File | What it does |
|---|---|---|
| 1 | `000_consolidated.sql` | Core tables: projects, feedback, insights, document_chunks, etc. |
| 2 | `001_schema.sql` | Additional schema elements |
| 3 | `001_fix_rls_grants.sql` | Grants for authenticated/service_role |
| 4 | `002_rls.sql` | Row Level Security policies |
| 5 | `004_chunk_index.sql` | pgvector index + `match_document_chunks` RPC |
| 6 | `005_feature_scoring.sql` | Feature ideas scoring tables |
| 7 | `006_project_context.sql` | Project context table |
| 8 | `20260428_create_multi_agent_reviews.sql` | Multi-agent review storage |
| 9 | `20260428_create_roadmaps.sql` | Roadmap storage |
| 10 | `20260429_create_ai_usage.sql` | AI usage tracking table |
| 11 | `20260429_global_chat_messages.sql` | Global chat message history |
| 12 | `20260504_decision_engine.sql` | Decision Engine `product_*` tables |
| 13 | `20260505_decision_review_hardening.sql` | `generated_by` columns + triggers |
| 14 | `20260520_decision_review_schema_alignment.sql` | Schema alignment for Decision Review service |

### Migration safety notes

- Most migrations use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` — **safe to re-run**.
- Migration `20260520` includes `ALTER COLUMN ... DROP NOT NULL` and `UPDATE` statements — these are idempotent but modify existing data.
- **Never run destructive migrations (DROP TABLE, DROP COLUMN) without testing on a branch project first.**
- Migrations that add columns are generally safe. Migrations that change column types or drop constraints need review.

### How to check if a migration is already applied

```sql
-- Check if a specific table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'ai_usage';

-- Check if a specific column exists
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'product_evidence' AND column_name = 'claim';

-- Check if the match_document_chunks RPC exists
SELECT proname FROM pg_proc WHERE proname = 'match_document_chunks';
```

### Verification queries after all migrations

```sql
-- Expect 7 product_* tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'product_%'
ORDER BY table_name;

-- Verify generated_by columns exist
SELECT table_name, column_name FROM information_schema.columns
WHERE column_name = 'generated_by' AND table_schema = 'public'
ORDER BY table_name;

-- Verify match_document_chunks RPC
SELECT proname, proargtypes::regtype[] FROM pg_proc
WHERE proname = 'match_document_chunks';
```

### Example: Decision Review schema alignment migration

Migration `20260520_decision_review_schema_alignment.sql` is a good example of a safe additive migration:

- Uses `ADD COLUMN IF NOT EXISTS` — won't fail if columns already exist
- Uses `ALTER COLUMN ... DROP NOT NULL` — idempotent
- Includes a backfill `UPDATE` — runs safely even if no rows match
- Does **not** drop any columns or tables

This migration was needed because `decision-review-service.ts` inserts columns (`claim`, `source_id`, `relevance_score`, `type`, `evidence_status`, `recommendation`, etc.) that weren't in the original Decision Engine migration.

---

## Vercel Deployment

### First deployment

1. Connect your GitHub repo to Vercel
2. Vercel auto-detects Next.js — no build configuration needed
3. Set all environment variables in **Vercel → Project → Settings → Environment Variables**
4. Deploy

### Environment variables for production

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for the complete reference. Quick checklist:

```
NEXT_PUBLIC_SUPABASE_URL        → your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   → Supabase anon/publishable key
SUPABASE_SERVICE_ROLE_KEY       → Supabase service role key (Secret)
OPENAI_API_KEY                  → OpenAI API key (Secret)
NEXT_PUBLIC_SITE_URL            → https://your-app.vercel.app
NEXT_PUBLIC_USE_MOCK_AUTH        → false
USE_MOCK_AUTH                    → false
USE_MOCK_DB                     → false
USE_REAL_AI                     → true
ADMIN_EMAILS                    → (optional) comma-separated admin emails
```

### Production safety guards

The app validates environment variables at runtime (`src/lib/env.ts`). In production (`NODE_ENV=production`, not during build), these checks are enforced:

| Condition | Error |
|---|---|
| `USE_MOCK_AUTH=true` | `[ENV] Mock auth is not allowed in production` |
| `USE_MOCK_DB=true` | `[ENV] Mock DB is not allowed in production` |
| `USE_REAL_AI=false` | `[ENV] USE_REAL_AI=false is not allowed in production` |
| `NEXT_PUBLIC_SITE_URL` contains `localhost` | `[ENV] NEXT_PUBLIC_SITE_URL cannot be localhost in production` |
| Any required env var missing | `[ENV] Missing required environment variable: <name>` |

These guards are skipped during `next build` (detected via `NEXT_PHASE`).

### Custom domain (LH.pl example)

1. Deploy to Vercel first — get the auto-assigned URL
2. Add domain in **Vercel → Project → Settings → Domains**
3. In your DNS provider: add CNAME `cname.vercel-dns.com` (subdomain) or A record `76.76.21.21` (apex)
4. Update `NEXT_PUBLIC_SITE_URL` to the custom domain
5. Add `https://your-domain.com/auth/callback` to Supabase redirect URLs
6. Redeploy
7. SSL is automatic via Vercel

---

## Production Build Check

Before deploying, verify the build succeeds locally:

```bash
npm run build
npm run lint
npm run format:check
```

The build will fail on TypeScript errors or ESLint violations.

---

## Pre-Deploy Checklist

```
□ All required env vars set in Vercel (see ENVIRONMENT_VARIABLES.md)
□ All mock flags set to false/true for production
□ NEXT_PUBLIC_SITE_URL set to production domain (not localhost)
□ Supabase Auth redirect URLs include production callback URL
□ All database migrations applied in order
□ Migration verification queries pass
□ npm run build succeeds locally
□ npm run lint passes
```

---

## Post-Deploy Smoke Tests

Run these after every production deployment:

1. **Landing page**: loads without errors
2. **Auth flow**: Sign up → confirm email → sign in → sign out → sign in again
3. **Project CRUD**: Create project → edit → delete → create again
4. **Feedback**: Add feedback with a unique phrase
5. **AI Chat**: Ask about the feedback phrase → verify RAG retrieves it
6. **Decision Engine**: Create decision → Analyze Decision → verify options/assumptions/recommendation appear
7. **Cross-project isolation**: Verify Project A's chat doesn't return Project B's feedback
8. **AI Usage**: Check `/usage` page shows tracked AI calls
9. **Rate limiting**: As non-admin user, trigger 6+ heavy AI requests → expect 429
10. **Settings**: Verify profile display, plan info, delete account modal
11. **404**: Visit `/nonexistent` → verify custom 404 page

---

## Rollback

### Application rollback

Vercel supports instant rollback:
1. Go to **Vercel → Project → Deployments**
2. Find the previous successful deployment
3. Click **⋮ → Promote to Production**

This is instant — no rebuild required.

### Database rollback

**Database changes are NOT rolled back by Vercel rollback.** If a migration was applied, the schema change persists.

For database rollback:
- Prepare reverse SQL *before* applying destructive migrations
- Test reverse migrations on a Supabase branch/dev project first
- Additive migrations (ADD COLUMN) generally don't need rollback — the old code simply ignores the new columns

---

## Common Deployment Failures

| Issue | Cause | Fix |
|---|---|---|
| `[ENV] Missing required environment variable` | Env var not set in Vercel | Add it in Vercel → Settings → Environment Variables, then redeploy |
| `[ENV] Mock auth is not allowed in production` | `USE_MOCK_AUTH=true` in production | Set to `false`, redeploy |
| `[ENV] NEXT_PUBLIC_SITE_URL cannot be localhost` | Site URL pointing to localhost | Set to production URL, redeploy |
| Email confirmation link fails | Supabase redirect URLs don't include `/auth/callback` for current domain | Add URL in Supabase Auth → URL Configuration |
| 401 on AI calls | `OPENAI_API_KEY` missing or invalid | Verify/replace key in Vercel, redeploy |
| RLS permission denied | Missing grants migration (`001_fix_rls_grants.sql`) | Run the migration in Supabase SQL Editor |
| RAG returns no context | `match_document_chunks` RPC missing or wrong signature | Run `004_chunk_index.sql` migration |
| Decision Review fails | Missing Decision Engine tables or `generated_by` columns | Run migrations 12, 13, 14 in order |
| Build fails | TypeScript error or dependency issue | Run `npm run build` locally to reproduce, fix, push |

---

## AI Rate Limits

All AI API routes are rate-limited per authenticated user:

| Tier | Routes | Limit |
|---|---|---|
| Standard | chat, global-chat, insights, prioritize, score-features | 20 requests / hour |
| Heavy | PRD, roadmap, competitive-analysis, multi-agent-review, decision-analyze | 5 requests / 15 min |

- Rate-limited requests return HTTP 429 with `Retry-After` header
- Admin users (emails in `ADMIN_EMAILS`) bypass all limits
- **Implementation**: in-memory sliding window (`src/lib/ai/rate-limiter.ts`)
- **Limitation**: on Vercel serverless, each function instance has its own memory, so limits are best-effort. For strict enforcement, replace with Redis/Upstash.

---

## Related Docs

- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) — every env var documented with usage and security notes
- [OBSERVABILITY.md](./OBSERVABILITY.md) — logging, monitoring, and what's observable
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) — troubleshooting playbooks for common failures
