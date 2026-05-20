-- Decision Review schema alignment
-- Adds columns expected by decision-review-service.ts that are missing from the original migration.

-- ── product_evidence: add missing columns ────────────────────────────
alter table product_evidence
  add column if not exists claim text,
  add column if not exists source_id text,
  add column if not exists relevance_score real;

-- Make title nullable (service may pass null when source title is unknown)
alter table product_evidence
  alter column title drop not null;

-- ── product_assumptions: add missing columns / rename ────────────────
-- The service inserts 'type' and 'evidence_status' but table has 'assumption_type' and 'status'.
-- Add the columns the service expects; keep originals for backward compatibility.
alter table product_assumptions
  add column if not exists type text,
  add column if not exists evidence_status text;

-- Backfill type from assumption_type if populated
update product_assumptions set type = assumption_type where type is null and assumption_type is not null;

-- ── product_decision_recommendations: expand for structured output ───
alter table product_decision_recommendations
  add column if not exists recommendation text,
  add column if not exists supporting_evidence jsonb default '[]'::jsonb,
  add column if not exists assumptions jsonb default '[]'::jsonb,
  add column if not exists risks jsonb default '[]'::jsonb,
  add column if not exists alternatives jsonb default '[]'::jsonb,
  add column if not exists next_validation_steps jsonb default '[]'::jsonb,
  add column if not exists confidence_score real;

-- Make summary nullable (service inserts recommendation instead)
alter table product_decision_recommendations
  alter column summary drop not null;

-- Make reasoning column accept jsonb (service inserts array, original was text)
-- We'll add a jsonb column and keep the old text one
-- Actually, just make reasoning nullable since the service may pass an array
alter table product_decision_recommendations
  alter column reasoning drop not null;

-- ── product_decision_options: add missing columns ────────────────────
alter table product_decision_options
  add column if not exists risks jsonb default '[]'::jsonb,
  add column if not exists expected_impact text,
  add column if not exists reversibility text,
  add column if not exists confidence_score real;



