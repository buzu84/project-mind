-- Decision Review hardening: add generated_by column to track AI-generated records.
-- This allows safe replacement of AI-generated records without deleting manual ones.

alter table product_decision_options
  add column if not exists generated_by text default null;

alter table product_assumptions
  add column if not exists generated_by text default null;

alter table product_evidence
  add column if not exists generated_by text default null;

alter table product_decision_recommendations
  add column if not exists generated_by text default null;

-- Index for efficient cleanup of AI-generated records
create index if not exists idx_product_evidence_generated_by
  on product_evidence (generated_by) where generated_by is not null;

create index if not exists idx_product_assumptions_generated_by
  on product_assumptions (generated_by) where generated_by is not null;

create index if not exists idx_product_decision_options_generated_by
  on product_decision_options (generated_by) where generated_by is not null;

