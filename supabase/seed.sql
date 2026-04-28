-- ============================================================
-- ProductMind: Seed Data
-- Run AFTER creating a user via the sign-up flow.
-- Replace the UUID below with your actual auth.users id.
-- ============================================================

-- To find your user ID after signing up:
--   SELECT id, email FROM auth.users LIMIT 5;

-- Set your user ID here:
DO $$
DECLARE
  demo_user_id uuid;
  p_taskflow uuid;
  p_healthpulse uuid;
  p_marketmind uuid;
  doc_id uuid;
BEGIN
  -- Get the first user (or replace with a specific ID)
  SELECT id INTO demo_user_id FROM auth.users LIMIT 1;

  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Sign up first, then run this seed.';
  END IF;

  RAISE NOTICE 'Seeding data for user: %', demo_user_id;

  -- ── Projects ────────────────────────────────────────────────
  INSERT INTO projects (id, user_id, name, description, target_users, market, business_model, goals)
  VALUES
    (gen_random_uuid(), demo_user_id, 'TaskFlow', 'AI-powered project management tool for remote teams', 'Remote engineering teams (10-100 people)', 'Project Management SaaS', 'Freemium with per-seat pricing', 'Reach 1,000 active teams within 6 months of launch')
  RETURNING id INTO p_taskflow;

  INSERT INTO projects (id, user_id, name, description, target_users, market, business_model, goals)
  VALUES
    (gen_random_uuid(), demo_user_id, 'HealthPulse', 'Personal health tracking app with AI-driven insights', 'Health-conscious adults aged 25-45', 'Digital Health & Wellness', 'Subscription-based ($9.99/month)', '50,000 downloads in first quarter, 20% conversion to paid')
  RETURNING id INTO p_healthpulse;

  INSERT INTO projects (id, user_id, name, description, target_users, market, business_model, goals)
  VALUES
    (gen_random_uuid(), demo_user_id, 'MarketMind', 'Competitive intelligence dashboard for startups', 'Startup founders and product managers', 'Business Intelligence', 'Tiered SaaS pricing', 'Validate MVP with 50 beta users, achieve $5K MRR')
  RETURNING id INTO p_marketmind;

  -- ── Feature Ideas for TaskFlow ──────────────────────────────
  INSERT INTO feature_ideas (project_id, name, priority, effort, impact, status) VALUES
    (p_taskflow, 'Real-time collaboration', 9, 8, 9, 'planned'),
    (p_taskflow, 'AI task assignment', 8, 7, 8, 'idea'),
    (p_taskflow, 'Sprint planning view', 7, 5, 7, 'planned'),
    (p_taskflow, 'Time tracking', 6, 4, 6, 'idea'),
    (p_taskflow, 'Slack integration', 5, 3, 7, 'idea');

  -- ── Decisions for TaskFlow ──────────────────────────────────
  INSERT INTO decisions (project_id, type, input, output) VALUES
    (p_taskflow, 'PRD', '{"productName":"TaskFlow","productDescription":"AI-powered project management for remote teams","targetAudience":"Remote engineering teams"}',
     '{"content":"# TaskFlow – PRD\n\n## Executive Summary\nTaskFlow is an AI-powered project management platform for distributed engineering teams.\n\n## Problem Statement\nRemote teams struggle with task visibility and async coordination.\n\n## Goals\n- Reduce task management time by 40%\n- 85% daily active usage\n- Support teams of 10-100"}'),
    (p_taskflow, 'PRIORITIZATION', '{"features":[{"name":"Real-time collaboration"},{"name":"AI task assignment"},{"name":"Sprint planning view"}]}',
     '{"content":"[{\"name\":\"Sprint planning view\",\"score\":100},{\"name\":\"Real-time collaboration\",\"score\":81},{\"name\":\"AI task assignment\",\"score\":56}]"}');

  -- ── Messages for TaskFlow ───────────────────────────────────
  INSERT INTO messages (project_id, role, content) VALUES
    (p_taskflow, 'user', 'What should our launch strategy look like for the first 3 months?'),
    (p_taskflow, 'assistant', E'Here''s a suggested 3-month launch strategy for TaskFlow:\n\n**Month 1 – Private Beta**\n- Invite 20 teams from your waitlist\n- Focus on core collaboration features\n- Collect qualitative feedback weekly\n\n**Month 2 – Public Beta**\n- Open signups with a free tier\n- Launch on Product Hunt\n- Start content marketing\n\n**Month 3 – GA Launch**\n- Introduce paid plans\n- Launch Slack integration\n- Begin outbound sales');

  -- ── Feedback Documents for HealthPulse ──────────────────────
  INSERT INTO feedback_documents (id, project_id, title, content, source)
  VALUES (gen_random_uuid(), p_healthpulse, 'Beta User Survey Results',
    E'Survey of 150 beta users:\n- 82% find the daily health score useful\n- 67% want Apple Health integration\n- 45% requested meal planning\n- Top complaint: onboarding too long\n- NPS: 42',
    'Typeform Survey – March 2026')
  RETURNING id INTO doc_id;

  INSERT INTO feedback_documents (project_id, title, content, source) VALUES
    (p_healthpulse, 'App Store Review Analysis',
     E'50 early reviews:\n- Average: 4.1/5\n- Positive: clean design, AI accuracy\n- Negative: battery drain, missing wearables\n- Requests: sleep tracking, water reminders',
     'App Store Connect');

  -- ── Insights ────────────────────────────────────────────────
  INSERT INTO insights (project_id, type, title, content, metadata) VALUES
    (p_healthpulse, 'user_feedback', 'Users want Apple Health integration',
     '67% of surveyed beta users requested Apple Health integration. This is the most requested feature.',
     '{"source":"beta_survey","confidence":0.85,"userCount":100}'),
    (p_healthpulse, 'market_trend', 'B2B wellness market growing 23% YoY',
     'Corporate wellness is a $61B market growing at 23% YoY. HealthPulse could offer team dashboards as a B2B line.',
     '{"source":"market_research","confidence":0.72}'),
    (p_healthpulse, 'product_risk', 'Battery drain reported by 30% of users',
     'Excessive battery usage is the top negative theme. Recommend switching to motion coprocessor API.',
     '{"source":"app_reviews","severity":"high"}'),
    (p_marketmind, 'competitive', 'Crayon raised $22M Series B',
     'Competitor Crayon focuses on enterprise CI. MarketMind should differentiate with self-serve SMB targeting.',
     '{"source":"crunchbase","competitor":"Crayon"}');

  RAISE NOTICE 'Seed complete! Created 3 projects with features, decisions, messages, documents, and insights.';
END $$;

