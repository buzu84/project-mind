-- Multi-Agent Reviews table
-- Stores structured feedback from four AI expert personas + consensus

create table if not exists public.multi_agent_reviews (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  question      text not null,
  input_type    text not null check (input_type in ('product_question', 'feature_idea')),
  pm_response   jsonb not null default '{}'::jsonb,
  cto_response  jsonb not null default '{}'::jsonb,
  ux_response   jsonb not null default '{}'::jsonb,
  growth_response jsonb not null default '{}'::jsonb,
  consensus     jsonb not null default '{}'::jsonb,
  model         text,
  is_mock       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists multi_agent_reviews_project_id_idx on public.multi_agent_reviews(project_id);
create index if not exists multi_agent_reviews_created_at_idx on public.multi_agent_reviews(created_at desc);

alter table public.multi_agent_reviews enable row level security;

create policy "Users can view their own project reviews"
  on public.multi_agent_reviews for select
  using (project_id in (select id from public.projects where user_id = auth.uid()));

create policy "Users can insert reviews for their own projects"
  on public.multi_agent_reviews for insert
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

create policy "Users can delete their own project reviews"
  on public.multi_agent_reviews for delete
  using (project_id in (select id from public.projects where user_id = auth.uid()));

