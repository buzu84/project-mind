-- ============================================================
-- ProductMind: Supabase SQL Schema
-- ============================================================

-- Enable pgvector
create extension if not exists vector with schema extensions;

-- ─── Profiles (synced from auth.users) ──────────────────────

create table profiles (
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
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function public.update_updated_at();

-- ─── Projects ───────────────────────────────────────────────

create table projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  target_users text,
  market text,
  business_model text,
  goals text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_projects_user_id on projects(user_id);

create trigger projects_updated_at
  before update on projects
  for each row execute function public.update_updated_at();

-- ─── Decisions ──────────────────────────────────────────────

create table decisions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  type text not null check (type in ('PRD', 'PRIORITIZATION', 'COMPETITIVE_ANALYSIS')),
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  created_at timestamptz default now() not null
);

create index idx_decisions_project_id on decisions(project_id);

-- ─── Messages ───────────────────────────────────────────────

create table messages (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default now() not null
);

create index idx_messages_project_id on messages(project_id);
create index idx_messages_project_created on messages(project_id, created_at);

-- ─── Feedback Documents ─────────────────────────────────────

create table feedback_documents (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  content text not null,
  source text,
  created_at timestamptz default now() not null
);

create index idx_feedback_documents_project_id on feedback_documents(project_id);

-- ─── Document Chunks (with pgvector embeddings) ─────────────

create table document_chunks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references feedback_documents(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  content text not null,
  embedding vector(1536),
  token_count int default 0 not null,
  created_at timestamptz default now() not null
);

create index idx_document_chunks_project_id on document_chunks(project_id);
create index idx_document_chunks_document_id on document_chunks(document_id);
create index idx_document_chunks_embedding on document_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Similarity search function
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

create table insights (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  type text not null,
  title text not null,
  content text not null,
  metadata jsonb,
  created_at timestamptz default now() not null
);

create index idx_insights_project_id on insights(project_id);
create index idx_insights_project_type on insights(project_id, type);

-- ─── Feature Ideas ──────────────────────────────────────────

create table feature_ideas (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  description text,
  priority int default 0 not null,
  effort int default 0 not null,
  impact int default 0 not null,
  status text default 'idea' not null check (status in ('idea', 'planned', 'in_progress', 'shipped', 'archived')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_feature_ideas_project_id on feature_ideas(project_id);

create trigger feature_ideas_updated_at
  before update on feature_ideas
  for each row execute function public.update_updated_at();

-- ─── AI Usage Tracking ──────────────────────────────────────

create table ai_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  action text not null,
  tokens_used int default 0 not null,
  model text default 'gpt-4o' not null,
  created_at timestamptz default now() not null
);

create index idx_ai_usage_user_id on ai_usage(user_id);
create index idx_ai_usage_user_created on ai_usage(user_id, created_at);

