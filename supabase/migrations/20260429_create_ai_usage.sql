-- AI Usage & Cost Tracking table

create table if not exists public.ai_usage (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null,
  project_id        uuid references public.projects(id) on delete set null,
  provider          text not null default 'openai',
  model             text not null,
  feature           text not null,
  prompt_tokens     integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens      integer not null default 0,
  input_cost        numeric not null default 0,
  output_cost       numeric not null default 0,
  estimated_cost    numeric not null default 0,
  currency          text not null default 'USD',
  is_mock           boolean not null default false,
  status            text not null default 'success' check (status in ('success', 'error', 'skipped')),
  error_message     text,
  latency_ms        integer,
  metadata          jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists ai_usage_user_id_idx on public.ai_usage(user_id);
create index if not exists ai_usage_project_id_idx on public.ai_usage(project_id);
create index if not exists ai_usage_feature_idx on public.ai_usage(feature);
create index if not exists ai_usage_created_at_idx on public.ai_usage(created_at desc);

alter table public.ai_usage enable row level security;

create policy "Users can view their own usage" on public.ai_usage for select using (user_id = auth.uid());
create policy "Server can insert usage" on public.ai_usage for insert with check (true);

