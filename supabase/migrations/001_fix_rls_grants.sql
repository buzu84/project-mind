-- ============================================================
-- ProductMind: Fix Grants + RLS Policies
-- ============================================================
-- Root cause: "Automatically expose new tables and functions"
-- was disabled in Supabase API settings, so tables created via
-- SQL Editor did not receive grants for authenticated/service_role.
--
-- This migration:
-- 1. Grants schema usage to all Supabase roles
-- 2. Grants table CRUD to authenticated + service_role
-- 3. Sets default privileges for future tables
-- 4. Ensures RLS is enabled on all tables
-- 5. Re-creates all RLS policies (idempotent)
--
-- Safe to run multiple times. Does NOT drop data or disable RLS.
-- ============================================================

-- ─── 1. Schema-level grants ─────────────────────────────────

grant usage on schema public to anon, authenticated, service_role;

-- ─── 2. Table-level grants ──────────────────────────────────
-- Grant CRUD to authenticated (for real auth sessions + RLS)
-- Grant CRUD to service_role (for server-side admin access, bypasses RLS)

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

-- Also grant to anon for read-only where needed (RLS will still restrict)
grant select on all tables in schema public to anon;

-- Grant sequence usage (needed for serial/auto-increment if any)
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Grant function execute
grant execute on all functions in schema public to authenticated, service_role;

-- ─── 3. Default privileges for future tables ────────────────
-- So any tables created later also get proper grants automatically.

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
  grant select on tables to anon;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to authenticated, service_role;

-- ─── 4. Ensure RLS is enabled on ALL app tables ─────────────

alter table if exists public.profiles enable row level security;
alter table if exists public.projects enable row level security;
alter table if exists public.project_context enable row level security;
alter table if exists public.decisions enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.global_chat_messages enable row level security;
alter table if exists public.feedback_documents enable row level security;
alter table if exists public.document_chunks enable row level security;
alter table if exists public.insights enable row level security;
alter table if exists public.feature_ideas enable row level security;
alter table if exists public.multi_agent_reviews enable row level security;
alter table if exists public.roadmaps enable row level security;
alter table if exists public.ai_usage enable row level security;

-- ─── 5. RLS Policies (idempotent: drop if exists, then create) ──

-- ── Profiles ────────────────────────────────────────────────
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ── Projects ────────────────────────────────────────────────
drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own projects"
  on public.projects for select using (user_id = auth.uid());

drop policy if exists "Users can create own projects" on public.projects;
create policy "Users can create own projects"
  on public.projects for insert with check (user_id = auth.uid());

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
  on public.projects for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects"
  on public.projects for delete using (user_id = auth.uid());

-- ── Project Context ─────────────────────────────────────────
drop policy if exists "Users can view own project context" on public.project_context;
create policy "Users can view own project context"
  on public.project_context for select
  using (project_id in (select id from public.projects where user_id = auth.uid()));

drop policy if exists "Users can insert own project context" on public.project_context;
create policy "Users can insert own project context"
  on public.project_context for insert
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

drop policy if exists "Users can update own project context" on public.project_context;
create policy "Users can update own project context"
  on public.project_context for update
  using (project_id in (select id from public.projects where user_id = auth.uid()));

-- ── Decisions ───────────────────────────────────────────────
drop policy if exists "Users can CRUD own project decisions" on public.decisions;
create policy "Users can CRUD own project decisions"
  on public.decisions for all
  using (project_id in (select id from public.projects where user_id = auth.uid()))
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

-- ── Messages ────────────────────────────────────────────────
drop policy if exists "Users can CRUD own project messages" on public.messages;
create policy "Users can CRUD own project messages"
  on public.messages for all
  using (project_id in (select id from public.projects where user_id = auth.uid()))
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

-- ── Global Chat Messages ────────────────────────────────────
drop policy if exists "Users can read own global chat messages" on public.global_chat_messages;
create policy "Users can read own global chat messages"
  on public.global_chat_messages for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own global chat messages" on public.global_chat_messages;
create policy "Users can insert own global chat messages"
  on public.global_chat_messages for insert with check (auth.uid() = user_id);

-- ── Feedback Documents ──────────────────────────────────────
drop policy if exists "Users can CRUD own project documents" on public.feedback_documents;
create policy "Users can CRUD own project documents"
  on public.feedback_documents for all
  using (project_id in (select id from public.projects where user_id = auth.uid()))
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

-- ── Document Chunks ─────────────────────────────────────────
drop policy if exists "Users can CRUD own project chunks" on public.document_chunks;
create policy "Users can CRUD own project chunks"
  on public.document_chunks for all
  using (project_id in (select id from public.projects where user_id = auth.uid()))
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

-- ── Insights ────────────────────────────────────────────────
drop policy if exists "Users can CRUD own project insights" on public.insights;
create policy "Users can CRUD own project insights"
  on public.insights for all
  using (project_id in (select id from public.projects where user_id = auth.uid()))
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

-- ── Feature Ideas ───────────────────────────────────────────
drop policy if exists "Users can CRUD own project feature ideas" on public.feature_ideas;
create policy "Users can CRUD own project feature ideas"
  on public.feature_ideas for all
  using (project_id in (select id from public.projects where user_id = auth.uid()))
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

-- ── Multi-Agent Reviews ─────────────────────────────────────
drop policy if exists "Users can view their own project reviews" on public.multi_agent_reviews;
create policy "Users can view their own project reviews"
  on public.multi_agent_reviews for select
  using (project_id in (select id from public.projects where user_id = auth.uid()));

drop policy if exists "Users can insert reviews for their own projects" on public.multi_agent_reviews;
create policy "Users can insert reviews for their own projects"
  on public.multi_agent_reviews for insert
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

drop policy if exists "Users can delete their own project reviews" on public.multi_agent_reviews;
create policy "Users can delete their own project reviews"
  on public.multi_agent_reviews for delete
  using (project_id in (select id from public.projects where user_id = auth.uid()));

-- ── Roadmaps ────────────────────────────────────────────────
drop policy if exists "Users can view their own project roadmaps" on public.roadmaps;
create policy "Users can view their own project roadmaps"
  on public.roadmaps for select
  using (project_id in (select id from public.projects where user_id = auth.uid()));

drop policy if exists "Users can insert roadmaps for their own projects" on public.roadmaps;
create policy "Users can insert roadmaps for their own projects"
  on public.roadmaps for insert
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

drop policy if exists "Users can update their own project roadmaps" on public.roadmaps;
create policy "Users can update their own project roadmaps"
  on public.roadmaps for update
  using (project_id in (select id from public.projects where user_id = auth.uid()));

drop policy if exists "Users can delete their own project roadmaps" on public.roadmaps;
create policy "Users can delete their own project roadmaps"
  on public.roadmaps for delete
  using (project_id in (select id from public.projects where user_id = auth.uid()));

-- ── AI Usage ────────────────────────────────────────────────
drop policy if exists "Users can view their own usage" on public.ai_usage;
create policy "Users can view their own usage"
  on public.ai_usage for select using (user_id = auth.uid());

drop policy if exists "Server can insert usage" on public.ai_usage;
create policy "Server can insert usage"
  on public.ai_usage for insert with check (true);

-- ============================================================
-- DONE. Grants + RLS policies applied.
-- ============================================================

