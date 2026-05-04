-- ─── Project Context ──────────────────────────────────────────

create table project_context (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null unique,
  product_overview text,
  target_personas text,
  current_metrics text,
  pain_points text,
  competitors text,
  strategic_goals text,
  constraints text,
  open_questions text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_project_context_project_id on project_context(project_id);

create trigger project_context_updated_at
  before update on project_context
  for each row execute function public.update_updated_at();

-- RLS
alter table project_context enable row level security;

create policy "Users can view own project context"
  on project_context for select
  using (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can insert own project context"
  on project_context for insert
  with check (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can update own project context"
  on project_context for update
  using (project_id in (select id from projects where user_id = auth.uid()));

