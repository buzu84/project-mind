-- Roadmaps table for AI-generated product roadmaps
-- One roadmap per project (regeneration replaces existing)

create table if not exists public.roadmaps (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  title         text not null default '',
  now_items     jsonb not null default '[]'::jsonb,
  next_items    jsonb not null default '[]'::jsonb,
  later_items   jsonb not null default '[]'::jsonb,
  plan_30_days  jsonb not null default '[]'::jsonb,
  plan_60_days  jsonb not null default '[]'::jsonb,
  plan_90_days  jsonb not null default '[]'::jsonb,
  risks         jsonb not null default '[]'::jsonb,
  dependencies  jsonb not null default '[]'::jsonb,
  success_metrics jsonb not null default '[]'::jsonb,
  is_mock         boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Only one roadmap per project
create unique index if not exists roadmaps_project_id_unique on public.roadmaps(project_id);

-- Index for fast lookups
create index if not exists roadmaps_project_id_idx on public.roadmaps(project_id);

-- RLS: users can only access roadmaps for their own projects
alter table public.roadmaps enable row level security;

create policy "Users can view their own project roadmaps"
  on public.roadmaps for select
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

create policy "Users can insert roadmaps for their own projects"
  on public.roadmaps for insert
  with check (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

create policy "Users can update their own project roadmaps"
  on public.roadmaps for update
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

create policy "Users can delete their own project roadmaps"
  on public.roadmaps for delete
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

