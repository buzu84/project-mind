-- Add RICE/ICE scoring fields to feature_ideas
alter table feature_ideas add column reach int default 0 not null;
alter table feature_ideas add column confidence int default 0 not null;
alter table feature_ideas add column rice_score numeric(10,2) default 0 not null;
alter table feature_ideas add column ice_score numeric(10,2) default 0 not null;
alter table feature_ideas add column ai_commentary text;

