-- Add scored_at timestamp to feature_ideas
-- Used to distinguish "user edited after scoring" from "scoring updated the row".
-- Without this, the updated_at trigger fires on scoring updates too,
-- making every scored feature appear "outdated" after page refresh.

alter table feature_ideas add column if not exists scored_at timestamptz;

