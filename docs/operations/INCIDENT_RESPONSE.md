# ProductMind — Incident Response Playbooks

Practical playbooks for diagnosing and recovering from common failures. This is an MVP app deployed on Vercel + Supabase — the playbooks match that reality.

---

## 1. OpenAI API Failure

**Symptoms**: AI features return errors; users see "AI request failed" or "AI is not configured" messages; `ai_usage` table shows rows with `status = 'error'`.

**Where to check**:
- Vercel logs: search for `[insights]`, `[roadmap]`, `[prd]`, `[decision-review]`, or other feature prefixes + "error"
- `ai_usage` table: `SELECT * FROM ai_usage WHERE status = 'error' ORDER BY created_at DESC LIMIT 10;`
- OpenAI status page: [status.openai.com](https://status.openai.com)
- OpenAI usage dashboard: check if spending limit was hit

**Likely causes**:
- Invalid or expired `OPENAI_API_KEY`
- OpenAI rate limit (429 from OpenAI, different from app-level rate limiting)
- OpenAI service outage
- Spending limit reached on OpenAI account

**Safe first actions**:
1. Check OpenAI status page
2. Verify `OPENAI_API_KEY` in Vercel env vars (re-paste if suspect)
3. Check OpenAI account for billing/spending alerts
4. Redeploy after fixing env var (Vercel picks up env changes on deploy)

**Rollback/mitigation**: No rollback needed — AI failures don't corrupt data. The app shows user-friendly error messages. Usage tracking records the error with sanitized message.

**Prevention**: Set spending limits on OpenAI account. Consider adding a health check that validates the API key on startup.

---

## 2. Supabase Connection / Auth Failure

**Symptoms**: Users can't sign in; protected pages redirect to sign-in loop; API calls return auth errors; "Supabase not configured" in logs.

**Where to check**:
- Vercel logs: search for `[supabase]` or `[ENV]`
- Supabase Dashboard → Project Status
- Supabase Dashboard → Authentication → Users (check if users exist)

**Likely causes**:
- `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` misconfigured
- Supabase project paused (free tier pauses after inactivity)
- Supabase Auth redirect URLs don't include current domain
- `NEXT_PUBLIC_SITE_URL` doesn't match what Supabase expects

**Safe first actions**:
1. Check Supabase Dashboard — is the project active?
2. If paused, restore it from Supabase Dashboard
3. Verify env vars in Vercel match Supabase Dashboard → Settings → API
4. Verify Supabase Auth → URL Configuration → Redirect URLs include `https://your-domain/auth/callback`
5. Redeploy

**Rollback/mitigation**: If the issue is a Supabase outage, there is no workaround — the app depends on Supabase for all data and auth.

**Prevention**: Supabase free tier pauses after 7 days of inactivity. Upgrade to Pro or set up a periodic ping to prevent pause.

---

## 3. Migration / Schema Mismatch

**Symptoms**: Features fail with "column X does not exist" or "relation does not exist"; `ai_usage` inserts fail; Decision Review analysis fails silently.

**Where to check**:
- Vercel logs: look for Supabase error messages mentioning missing columns/tables
- Supabase SQL Editor: run verification queries from DEPLOYMENT.md

**Likely causes**:
- A migration was skipped or run out of order
- A new deployment expects columns that haven't been added yet
- A migration partially failed (some statements ran, others didn't)

**Safe first actions**:
1. Check which tables/columns exist:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
   ```
2. Check for expected columns:
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'product_evidence' AND table_schema = 'public';
   ```
3. Run the missing migration in Supabase SQL Editor
4. Most migrations use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` — safe to re-run

**Rollback/mitigation**: If a migration added columns that break something, the columns can be dropped. But `ALTER TABLE ... DROP COLUMN` is destructive — test in a branch/dev project first.

**Prevention**: Always run migrations before deploying code that depends on them. Check migration verification queries after applying.

---

## 4. Decision Review Failure

**Symptoms**: "Analyze Decision" button shows error; decision page shows no AI-generated options/assumptions/recommendation; `ai_usage` shows `decision_review` errors.

**Where to check**:
- `ai_usage` table: `SELECT * FROM ai_usage WHERE feature = 'decision_review' ORDER BY created_at DESC LIMIT 5;`
- Vercel logs: search for `[decision-review]`
- In dev: Decision Review service logs detailed phase progress and Zod validation errors

**Likely causes**:
- OpenAI returned malformed JSON (Zod validation failed)
- Missing Decision Engine tables (migration not applied)
- Missing `generated_by` column (migration `20260505` not applied)
- Schema mismatch between service expectations and actual table columns (migration `20260520` not applied)

**Safe first actions**:
1. Check `ai_usage` for the specific error message
2. Verify Decision Engine tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'product_%' ORDER BY table_name;
   ```
3. Verify `generated_by` columns exist:
   ```sql
   SELECT table_name, column_name FROM information_schema.columns WHERE column_name = 'generated_by' AND table_schema = 'public';
   ```
4. If tables/columns missing, run the relevant migration
5. Retry the analysis — the service does one automatic retry on JSON parse failure

**Rollback/mitigation**: Decision Review uses insert-before-delete. If the new analysis fails, previous AI-generated data remains. Manual entries (`generated_by = 'manual'`) are never affected.

---

## 5. RAG Retrieval Failure

**Symptoms**: AI Chat says "I don't have context about your project" even though feedback exists; insights/PRD/analysis don't reference user feedback.

**Where to check**:
- Vercel logs: search for `[rag]`
- Check if chunks exist:
  ```sql
  SELECT COUNT(*) FROM document_chunks WHERE project_id = '<project-id>';
  ```
- Check if `match_document_chunks` RPC exists:
  ```sql
  SELECT proname FROM pg_proc WHERE proname = 'match_document_chunks';
  ```

**Likely causes**:
- Feedback was added but chunks weren't embedded (ingestion failed)
- `match_document_chunks` RPC doesn't exist (migration `004_chunk_index.sql` not applied)
- pgvector extension not enabled
- RPC parameter signature mismatch

**Safe first actions**:
1. Check chunk count for the project
2. If zero chunks: delete and re-add the feedback document to trigger re-ingestion
3. Verify the RPC exists and check its parameter types:
   ```sql
   SELECT proname, proargtypes::regtype[] FROM pg_proc WHERE proname = 'match_document_chunks';
   ```
4. Check Vercel logs for `[rag] Failed to store chunks` errors

**Rollback/mitigation**: RAG failures are non-fatal. AI features fall back to operating without evidence context.

---

## 6. Rate Limit False Positive or Abuse

**Symptoms**: Legitimate user gets 429 responses; or a user is making excessive AI calls without being limited.

**Where to check**:
- Vercel logs: search for `[rate-limit] BLOCKED`
- Check if user is in `ADMIN_EMAILS` (admins bypass limits)

**Likely causes (false positive)**:
- Vercel cold start created a fresh serverless instance with empty rate limit state — then user hit the limit on a different instance that had accumulated their requests
- User's email is not in `ADMIN_EMAILS` but should be

**Likely causes (abuse not limited)**:
- In-memory rate limiter resets on each new serverless instance
- User is listed in `ADMIN_EMAILS` (unlimited access)

**Safe first actions**:
1. For false positive: add user to `ADMIN_EMAILS` temporarily, or wait for window to expire
2. For abuse: check `ai_usage` table for the user's request volume
3. If rate limiting needs to be strict: implement Redis/Upstash-backed rate limiter

**Current limitation**: In-memory rate limiting on Vercel serverless is best-effort only. Each function instance has its own memory.

---

## 7. Vercel Deployment Failure

**Symptoms**: Deployment fails in Vercel dashboard; app shows old version.

**Where to check**:
- Vercel → Project → Deployments → failed deployment → Build Logs
- Common: TypeScript errors, missing dependencies, env var issues during build

**Likely causes**:
- TypeScript compilation error
- Missing `npm install` (dependency not in package.json)
- Env var validation failing during build (unlikely — build phase is detected and skipped)

**Safe first actions**:
1. Read the build log error message
2. Run `npm run build` locally to reproduce
3. Fix the error and push again
4. Vercel automatically keeps the previous deployment active until the new one succeeds

**Rollback**: Vercel → Deployments → click on previous successful deployment → "Promote to Production" (instant).

---

## 8. Environment Variable Misconfiguration

**Symptoms**: App crashes immediately with `[ENV]` prefix errors; or specific features fail silently.

**Where to check**:
- Vercel logs: search for `[ENV]`
- Vercel → Project → Settings → Environment Variables

**Common mistakes**:
- `NEXT_PUBLIC_SITE_URL` set to `http://localhost:3000` in production
- `USE_MOCK_AUTH=true` left in production env vars
- `OPENAI_API_KEY` not set or expired
- `SUPABASE_SERVICE_ROLE_KEY` copied from wrong project
- Env var set for "Preview" but not "Production" in Vercel

**Safe first actions**:
1. Compare Vercel env vars against the table in DEPLOYMENT.md
2. Fix the incorrect variable
3. Redeploy (Vercel doesn't pick up env var changes without redeployment)

---

## 9. Unexpected Production Error (Generic)

**Symptoms**: User reports something is broken; no specific error category.

**Triage steps**:
1. Check Vercel logs for recent errors (filter by time)
2. Check `ai_usage` table for recent errors: `SELECT * FROM ai_usage WHERE status = 'error' ORDER BY created_at DESC LIMIT 10;`
3. Try to reproduce the issue yourself
4. Check Supabase Dashboard — is the project active?
5. Check OpenAI status page
6. Check if a recent deployment introduced the issue (Vercel deployment history)

**If you can't identify the cause**:
1. Roll back to previous Vercel deployment
2. Investigate locally with `npm run dev` against production Supabase (use read-only queries)
3. Check the client-side browser console for errors (ask the user for a screenshot)

---

## General Principles

- **AI failures are non-destructive**: Failed AI calls don't corrupt data. The usage tracker records the error. The user sees a friendly message.
- **Insert-before-delete**: Decision Review and other re-analysis features write new data before cleaning up old data. Failures leave old data intact.
- **Error messages are sanitized**: API keys are redacted from all error messages (`src/lib/errors.ts` and `src/lib/ai/usage-tracking.ts`). Safe to share error messages externally.
- **Vercel instant rollback**: Any previous deployment can be promoted to production instantly from the Vercel dashboard.
- **Database changes are NOT rolled back by Vercel rollback**: If a migration was applied, rolling back the deployment doesn't undo the schema change. Prepare reverse SQL if needed.

