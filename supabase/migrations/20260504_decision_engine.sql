-- Decision Engine tables for ProductMind
-- Migration: 20260504_decision_engine.sql

-- 1. decisions
create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  category text not null default 'other',
  status text not null default 'draft',
  problem_statement text not null,
  context_summary text,
  confidence_score numeric,
  selected_option_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_decisions_user_project on decisions(user_id, project_id);
create index if not exists idx_decisions_project on decisions(project_id);

alter table decisions enable row level security;
create policy "decisions_owner" on decisions
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from projects where projects.id = project_id and projects.user_id = auth.uid())
  );

-- 2. decision_options
create table if not exists decision_options (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  decision_id uuid not null references decisions(id) on delete cascade,
  title text not null,
  description text,
  pros jsonb not null default '[]',
  cons jsonb not null default '[]',
  risks jsonb not null default '[]',
  expected_impact text,
  effort_estimate text not null default 'unknown',
  reversibility text not null default 'unknown',
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_decision_options_decision on decision_options(user_id, project_id, decision_id);

alter table decision_options enable row level security;
create policy "decision_options_owner" on decision_options
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from projects where projects.id = project_id and projects.user_id = auth.uid())
  );

-- 3. assumptions
create table if not exists assumptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  decision_id uuid references decisions(id) on delete set null,
  statement text not null,
  type text not null default 'other',
  risk_level text not null default 'medium',
  evidence_status text not null default 'unsupported',
  validation_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assumptions_user_project on assumptions(user_id, project_id);
create index if not exists idx_assumptions_decision on assumptions(user_id, project_id, decision_id);

alter table assumptions enable row level security;
create policy "assumptions_owner" on assumptions
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4. evidence
create table if not exists evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  source_type text not null default 'manual',
  source_id uuid,
  title text,
  claim text not null,
  content text,
  relevance_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_evidence_user_project on evidence(user_id, project_id);

alter table evidence enable row level security;
create policy "evidence_owner" on evidence
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from projects where projects.id = project_id and projects.user_id = auth.uid())
  );

-- 5. decision_evidence_links
create table if not exists decision_evidence_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  decision_id uuid not null references decisions(id) on delete cascade,
  evidence_id uuid not null references evidence(id) on delete cascade,
  link_type text not null default 'informs',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_decision_evidence_links_decision on decision_evidence_links(user_id, project_id, decision_id);
create index if not exists idx_decision_evidence_links_evidence on decision_evidence_links(evidence_id);

alter table decision_evidence_links enable row level security;
create policy "decision_evidence_links_owner" on decision_evidence_links
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from projects where projects.id = project_id and projects.user_id = auth.uid())
  );

-- unique constraint: one link per decision+evidence+type
create unique index if not exists idx_del_unique on decision_evidence_links(decision_id, evidence_id, link_type);

-- 6. decision_agent_reviews
create table if not exists decision_agent_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  decision_id uuid not null references decisions(id) on delete cascade,
  agent_role text not null,
  position text not null,
  key_concerns jsonb not null default '[]',
  supporting_evidence jsonb not null default '[]',
  assumptions jsonb not null default '[]',
  risks jsonb not null default '[]',
  recommendation text not null,
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_decision_agent_reviews_decision on decision_agent_reviews(user_id, project_id, decision_id);

alter table decision_agent_reviews enable row level security;
create policy "decision_agent_reviews_owner" on decision_agent_reviews
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from projects where projects.id = project_id and projects.user_id = auth.uid())
  );

-- 7. decision_recommendations
create table if not exists decision_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  decision_id uuid not null references decisions(id) on delete cascade,
  recommendation text not null,
  reasoning jsonb not null default '[]',
  supporting_evidence jsonb not null default '[]',
  assumptions jsonb not null default '[]',
  risks jsonb not null default '[]',
  alternatives jsonb not null default '[]',
  next_validation_steps jsonb not null default '[]',
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_decision_recommendations_decision on decision_recommendations(user_id, project_id, decision_id);

alter table decision_recommendations enable row level security;
create policy "decision_recommendations_owner" on decision_recommendations
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from projects where projects.id = project_id and projects.user_id = auth.uid())
  );

-- Add selected_option_id FK (deferred because decision_options table must exist first)
alter table decisions
  add constraint fk_decisions_selected_option
  foreign key (selected_option_id)
  references decision_options(id)
  on delete set null;

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGER: validate selected_option_id belongs to same decision
-- ═══════════════════════════════════════════════════════════════════

create or replace function validate_selected_option_belongs_to_decision()
returns trigger
language plpgsql
as $$
begin
  if NEW.selected_option_id is not null then
    if not exists (
      select 1 from decision_options
      where id = NEW.selected_option_id
        and decision_id = NEW.id
    ) then
      raise exception 'selected_option_id % does not belong to decision %',
        NEW.selected_option_id, NEW.id;
    end if;
  end if;
  return NEW;
end;
$$;

create trigger trg_decisions_validate_selected_option
  before insert or update on decisions
  for each row
  execute function validate_selected_option_belongs_to_decision();

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGER: auto-update updated_at on all Decision Engine tables
-- ═══════════════════════════════════════════════════════════════════

create or replace function set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

create trigger trg_decisions_updated_at
  before update on decisions
  for each row execute function set_updated_at_timestamp();

create trigger trg_decision_options_updated_at
  before update on decision_options
  for each row execute function set_updated_at_timestamp();

create trigger trg_assumptions_updated_at
  before update on assumptions
  for each row execute function set_updated_at_timestamp();

create trigger trg_evidence_updated_at
  before update on evidence
  for each row execute function set_updated_at_timestamp();

create trigger trg_decision_evidence_links_updated_at
  before update on decision_evidence_links
  for each row execute function set_updated_at_timestamp();

create trigger trg_decision_agent_reviews_updated_at
  before update on decision_agent_reviews
  for each row execute function set_updated_at_timestamp();

create trigger trg_decision_recommendations_updated_at
  before update on decision_recommendations
  for each row execute function set_updated_at_timestamp();

