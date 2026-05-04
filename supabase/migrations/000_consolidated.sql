-- ============================================================
-- ProductMind: CONSOLIDATED MIGRATION
-- Run this in Supabase SQL Editor to create all tables from scratch.
-- Safe to run: uses IF NOT EXISTS / OR REPLACE throughout.
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists vector with schema extensions;

-- ─── Helper: updated_at trigger function ────────────────────
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── Profiles ───────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- ─── Dev user profile ───────────────────────────────────────
-- For USE_MOCK_AUTH=true mode. Insert a profile row so FK constraints work.
-- This does NOT create an auth.users row — we handle that via service role below.
-- We need the user to exist in auth.users first for the FK to work.

-- Create dev user in auth.users (requires service_role or running in SQL editor)
-- The SQL Editor runs as postgres so this works:
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'dev@productmind.app',
  crypt('devpassword123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Dev User"}'::jsonb,
  'authenticated',
  'authenticated'
) on conflict (id) do nothing;

-- Now the profile (the trigger should have created it, but just in case):
insert into public.profiles (id, email, name, avatar_url)
values (
  '00000000-0000-0000-0000-000000000001',
  'dev@productmind.app',
  'Dev User',
  null
) on conflict (id) do nothing;

-- ─── Projects ───────────────────────────────────────────────
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  target_users text,
  market text,
  business_model text,
  goals text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_projects_user_id on public.projects(user_id);

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.update_updated_at();

-- ─── Project Context ────────────────────────────────────────
create table if not exists public.project_context (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null unique,
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

create index if not exists idx_project_context_project_id on public.project_context(project_id);

drop trigger if exists project_context_updated_at on public.project_context;
create trigger project_context_updated_at
  before update on public.project_context
  for each row execute function public.update_updated_at();

-- ─── Decisions ──────────────────────────────────────────────
create table if not exists public.decisions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  type text not null check (type in ('PRD', 'PRIORITIZATION', 'COMPETITIVE_ANALYSIS')),
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  created_at timestamptz default now() not null
);

create index if not exists idx_decisions_project_id on public.decisions(project_id);

-- ─── Messages (project-scoped chat) ─────────────────────────
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_messages_project_id on public.messages(project_id);
create index if not exists idx_messages_project_created on public.messages(project_id, created_at);

-- ─── Global Chat Messages ───────────────────────────────────
create table if not exists public.global_chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_global_chat_messages_user on public.global_chat_messages(user_id, created_at);

-- ─── Feedback Documents ─────────────────────────────────────
create table if not exists public.feedback_documents (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  content text not null,
  source text,
  created_at timestamptz default now() not null
);

create index if not exists idx_feedback_documents_project_id on public.feedback_documents(project_id);

-- ─── Document Chunks (with pgvector embeddings) ─────────────
create table if not exists public.document_chunks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.feedback_documents(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  content text not null,
  embedding vector(1536),
  token_count int default 0 not null,
  chunk_index int default 0 not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_document_chunks_project_id on public.document_chunks(project_id);
create index if not exists idx_document_chunks_document_id on public.document_chunks(document_id);

-- Vector similarity search function
create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_project_id uuid,
  match_threshold float default 0.78,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where document_chunks.project_id = match_project_id
    and 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- ─── Insights ───────────────────────────────────────────────
create table if not exists public.insights (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  type text not null,
  title text not null,
  content text not null,
  metadata jsonb,
  created_at timestamptz default now() not null
);

create index if not exists idx_insights_project_id on public.insights(project_id);
create index if not exists idx_insights_project_type on public.insights(project_id, type);

-- ─── Feature Ideas ──────────────────────────────────────────
create table if not exists public.feature_ideas (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  description text,
  priority int default 0 not null,
  effort int default 0 not null,
  impact int default 0 not null,
  reach int default 0 not null,
  confidence int default 0 not null,
  rice_score numeric(10,2) default 0 not null,
  ice_score numeric(10,2) default 0 not null,
  ai_commentary text,
  status text default 'idea' not null check (status in ('idea', 'planned', 'in_progress', 'shipped', 'archived')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_feature_ideas_project_id on public.feature_ideas(project_id);

drop trigger if exists feature_ideas_updated_at on public.feature_ideas;
create trigger feature_ideas_updated_at
  before update on public.feature_ideas
  for each row execute function public.update_updated_at();

-- ─── Multi-Agent Reviews ────────────────────────────────────
create table if not exists public.multi_agent_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  question text not null,
  input_type text not null check (input_type in ('product_question', 'feature_idea')),
  pm_response jsonb not null default '{}'::jsonb,
  cto_response jsonb not null default '{}'::jsonb,
  ux_response jsonb not null default '{}'::jsonb,
  growth_response jsonb not null default '{}'::jsonb,
  consensus jsonb not null default '{}'::jsonb,
  model text,
  is_mock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists multi_agent_reviews_project_id_idx on public.multi_agent_reviews(project_id);
create index if not exists multi_agent_reviews_created_at_idx on public.multi_agent_reviews(created_at desc);

-- ─── Roadmaps ───────────────────────────────────────────────
create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null default '',
  now_items jsonb not null default '[]'::jsonb,
  next_items jsonb not null default '[]'::jsonb,
  later_items jsonb not null default '[]'::jsonb,
  plan_30_days jsonb not null default '[]'::jsonb,
  plan_60_days jsonb not null default '[]'::jsonb,
  plan_90_days jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  dependencies jsonb not null default '[]'::jsonb,
  success_metrics jsonb not null default '[]'::jsonb,
  is_mock boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists roadmaps_project_id_unique on public.roadmaps(project_id);

-- ─── AI Usage ───────────────────────────────────────────────
-- NOTE: The app uses these columns: feature, prompt_tokens, completion_tokens,
-- total_tokens, estimated_cost, is_mock, status, etc.
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid references public.projects(id) on delete set null,
  provider text not null default 'openai',
  model text not null,
  feature text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  input_cost numeric not null default 0,
  output_cost numeric not null default 0,
  estimated_cost numeric not null default 0,
  currency text not null default 'USD',
  is_mock boolean not null default false,
  status text not null default 'success' check (status in ('success', 'error', 'skipped')),
  error_message text,
  latency_ms integer,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_id_idx on public.ai_usage(user_id);
create index if not exists ai_usage_project_id_idx on public.ai_usage(project_id);
create index if not exists ai_usage_feature_idx on public.ai_usage(feature);
create index if not exists ai_usage_created_at_idx on public.ai_usage(created_at desc);


-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ─── 0. Grants (required if "Automatically expose" is disabled) ──
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant select on tables to anon;

-- ─── Profiles ───────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ─── Projects ───────────────────────────────────────────────
alter table public.projects enable row level security;

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

-- ─── Project Context ────────────────────────────────────────
alter table public.project_context enable row level security;

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

-- ─── Decisions ──────────────────────────────────────────────
alter table public.decisions enable row level security;

drop policy if exists "Users can CRUD own project decisions" on public.decisions;
create policy "Users can CRUD own project decisions"
  on public.decisions for all
  using (project_id in (select id from public.projects where user_id = auth.uid()))
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

-- ─── Messages ───────────────────────────────────────────────
alter table public.messages enable row level security;

drop policy if exists "Users can CRUD own project messages" on public.messages;
create policy "Users can CRUD own project messages"
  on public.messages for all
  using (project_id in (select id from public.projects where user_id = auth.uid()))
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

-- ─── Global Chat Messages ───────────────────────────────────
alter table public.global_chat_messages enable row level security;

drop policy if exists "Users can read own global chat messages" on public.global_chat_messages;
create policy "Users can read own global chat messages"
  on public.global_chat_messages for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own global chat messages" on public.global_chat_messages;
create policy "Users can insert own global chat messages"
  on public.global_chat_messages for insert with check (auth.uid() = user_id);

-- ─── Feedback Documents ─────────────────────────────────────
alter table public.feedback_documents enable row level security;

drop policy if exists "Users can CRUD own project documents" on public.feedback_documents;
create policy "Users can CRUD own project documents"
  on public.feedback_documents for all
  using (project_id in (select id from public.projects where user_id = auth.uid()))
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

-- ─── Document Chunks ────────────────────────────────────────
alter table public.document_chunks enable row level security;

drop policy if exists "Users can CRUD own project chunks" on public.document_chunks;
create policy "Users can CRUD own project chunks"
  on public.document_chunks for all
  using (project_id in (select id from public.projects where user_id = auth.uid()))
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

-- ─── Insights ───────────────────────────────────────────────
alter table public.insights enable row level security;

drop policy if exists "Users can CRUD own project insights" on public.insights;
create policy "Users can CRUD own project insights"
  on public.insights for all
  using (project_id in (select id from public.projects where user_id = auth.uid()))
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

-- ─── Feature Ideas ──────────────────────────────────────────
alter table public.feature_ideas enable row level security;

drop policy if exists "Users can CRUD own project feature ideas" on public.feature_ideas;
create policy "Users can CRUD own project feature ideas"
  on public.feature_ideas for all
  using (project_id in (select id from public.projects where user_id = auth.uid()))
  with check (project_id in (select id from public.projects where user_id = auth.uid()));

-- ─── Multi-Agent Reviews ────────────────────────────────────
alter table public.multi_agent_reviews enable row level security;

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

-- ─── Roadmaps ───────────────────────────────────────────────
alter table public.roadmaps enable row level security;

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

-- ─── AI Usage ───────────────────────────────────────────────
alter table public.ai_usage enable row level security;

drop policy if exists "Users can view their own usage" on public.ai_usage;
create policy "Users can view their own usage"
  on public.ai_usage for select using (user_id = auth.uid());

drop policy if exists "Server can insert usage" on public.ai_usage;
create policy "Server can insert usage"
  on public.ai_usage for insert with check (true);


-- ============================================================
-- DONE! All tables, indexes, triggers, and RLS policies created.
-- ============================================================

