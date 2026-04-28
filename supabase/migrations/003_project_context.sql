-- ============================================================
-- Project Context: structured context sections for AI enrichment
-- ============================================================

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

