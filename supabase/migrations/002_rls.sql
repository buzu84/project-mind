-- ============================================================
-- ProductMind: Row Level Security Policies
-- ============================================================

-- ─── Profiles ───────────────────────────────────────────────

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── Projects ───────────────────────────────────────────────

alter table projects enable row level security;

create policy "Users can view own projects"
  on projects for select
  using (user_id = auth.uid());

create policy "Users can create own projects"
  on projects for insert
  with check (user_id = auth.uid());

create policy "Users can update own projects"
  on projects for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own projects"
  on projects for delete
  using (user_id = auth.uid());

-- ─── Helper: check project ownership ────────────────────────
-- All child tables use this pattern:
--   project_id in (select id from projects where user_id = auth.uid())

-- ─── Decisions ──────────────────────────────────────────────

alter table decisions enable row level security;

create policy "Users can CRUD own project decisions"
  on decisions for all
  using (project_id in (select id from projects where user_id = auth.uid()))
  with check (project_id in (select id from projects where user_id = auth.uid()));

-- ─── Messages ───────────────────────────────────────────────

alter table messages enable row level security;

create policy "Users can CRUD own project messages"
  on messages for all
  using (project_id in (select id from projects where user_id = auth.uid()))
  with check (project_id in (select id from projects where user_id = auth.uid()));

-- ─── Feedback Documents ─────────────────────────────────────

alter table feedback_documents enable row level security;

create policy "Users can CRUD own project documents"
  on feedback_documents for all
  using (project_id in (select id from projects where user_id = auth.uid()))
  with check (project_id in (select id from projects where user_id = auth.uid()));

-- ─── Document Chunks ────────────────────────────────────────

alter table document_chunks enable row level security;

create policy "Users can CRUD own project chunks"
  on document_chunks for all
  using (project_id in (select id from projects where user_id = auth.uid()))
  with check (project_id in (select id from projects where user_id = auth.uid()));

-- ─── Insights ───────────────────────────────────────────────

alter table insights enable row level security;

create policy "Users can CRUD own project insights"
  on insights for all
  using (project_id in (select id from projects where user_id = auth.uid()))
  with check (project_id in (select id from projects where user_id = auth.uid()));

-- ─── Feature Ideas ──────────────────────────────────────────

alter table feature_ideas enable row level security;

create policy "Users can CRUD own project feature ideas"
  on feature_ideas for all
  using (project_id in (select id from projects where user_id = auth.uid()))
  with check (project_id in (select id from projects where user_id = auth.uid()));

-- ─── AI Usage ───────────────────────────────────────────────

alter table ai_usage enable row level security;

create policy "Users can view own AI usage"
  on ai_usage for select
  using (user_id = auth.uid());

create policy "Users can insert own AI usage"
  on ai_usage for insert
  with check (user_id = auth.uid());

