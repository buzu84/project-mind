-- Decision Engine – ProductMind
--
-- The legacy `decisions` table is used for existing AI output history,
-- so the new Decision Engine uses `product_*` table names to avoid collision.
--

-- ═══════════════════════════════════════════════════════════════════
-- 1. TABLES
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_decisions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         text NOT NULL,
  category      text NOT NULL,
  status        text NOT NULL DEFAULT 'draft',
  problem_statement text,
  context_summary   text,
  confidence_score  smallint CHECK (confidence_score >= 0 AND confidence_score <= 100),
  effort_estimate   text,
  reversibility     text,
  deadline      timestamptz,
  selected_option_id uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_decision_options (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  decision_id   uuid NOT NULL REFERENCES product_decisions(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  pros          jsonb DEFAULT '[]'::jsonb,
  cons          jsonb DEFAULT '[]'::jsonb,
  effort_estimate text,
  risk_level    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_assumptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  decision_id   uuid REFERENCES product_decisions(id) ON DELETE SET NULL,
  assumption_type text NOT NULL,
  statement     text NOT NULL,
  status        text NOT NULL DEFAULT 'untested',
  risk_level    text NOT NULL DEFAULT 'medium',
  validation_method text,
  result        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_evidence (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         text NOT NULL,
  source_type   text NOT NULL,
  source_url    text,
  content       text,
  status        text NOT NULL DEFAULT 'raw',
  tags          jsonb DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_decision_evidence_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  decision_id   uuid NOT NULL REFERENCES product_decisions(id) ON DELETE CASCADE,
  evidence_id   uuid NOT NULL REFERENCES product_evidence(id) ON DELETE CASCADE,
  link_type     text NOT NULL DEFAULT 'supports',
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(decision_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS product_decision_agent_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  decision_id   uuid NOT NULL REFERENCES product_decisions(id) ON DELETE CASCADE,
  agent_role    text NOT NULL,
  verdict       text NOT NULL,
  reasoning     text NOT NULL,
  concerns      jsonb DEFAULT '[]'::jsonb,
  suggestions   jsonb DEFAULT '[]'::jsonb,
  confidence    real CHECK (confidence >= 0 AND confidence <= 1),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_decision_recommendations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  decision_id   uuid NOT NULL REFERENCES product_decisions(id) ON DELETE CASCADE,
  recommended_option_id uuid REFERENCES product_decision_options(id) ON DELETE SET NULL,
  summary       text NOT NULL,
  reasoning     text NOT NULL,
  risk_assessment text,
  next_steps    jsonb DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- selected_option_id FK (deferred because product_decision_options must exist first)
ALTER TABLE product_decisions
  ADD CONSTRAINT fk_selected_option
  FOREIGN KEY (selected_option_id)
  REFERENCES product_decision_options(id)
  ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX idx_product_decisions_user       ON product_decisions(user_id);
CREATE INDEX idx_product_decisions_project    ON product_decisions(project_id);
CREATE INDEX idx_product_decisions_status     ON product_decisions(status);

CREATE INDEX idx_product_decision_options_decision ON product_decision_options(decision_id);
CREATE INDEX idx_product_decision_options_user     ON product_decision_options(user_id);

CREATE INDEX idx_product_assumptions_project  ON product_assumptions(project_id);
CREATE INDEX idx_product_assumptions_decision ON product_assumptions(decision_id);
CREATE INDEX idx_product_assumptions_user     ON product_assumptions(user_id);

CREATE INDEX idx_product_evidence_project     ON product_evidence(project_id);
CREATE INDEX idx_product_evidence_user        ON product_evidence(user_id);
CREATE INDEX idx_product_evidence_source_type ON product_evidence(source_type);

CREATE INDEX idx_product_decision_evidence_links_decision ON product_decision_evidence_links(decision_id);
CREATE INDEX idx_product_decision_evidence_links_evidence ON product_decision_evidence_links(evidence_id);

CREATE INDEX idx_product_decision_agent_reviews_decision ON product_decision_agent_reviews(decision_id);

CREATE INDEX idx_product_decision_recommendations_decision ON product_decision_recommendations(decision_id);

-- ═══════════════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE product_decisions                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_decision_options             ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_assumptions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_evidence                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_decision_evidence_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_decision_agent_reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_decision_recommendations     ENABLE ROW LEVEL SECURITY;

-- product_decisions
CREATE POLICY "product_decisions_select" ON product_decisions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "product_decisions_insert" ON product_decisions FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);
CREATE POLICY "product_decisions_update" ON product_decisions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "product_decisions_delete" ON product_decisions FOR DELETE USING (user_id = auth.uid());

-- product_decision_options
CREATE POLICY "product_decision_options_select" ON product_decision_options FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "product_decision_options_insert" ON product_decision_options FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);
CREATE POLICY "product_decision_options_update" ON product_decision_options FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "product_decision_options_delete" ON product_decision_options FOR DELETE USING (user_id = auth.uid());

-- product_assumptions
CREATE POLICY "product_assumptions_select" ON product_assumptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "product_assumptions_insert" ON product_assumptions FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);
CREATE POLICY "product_assumptions_update" ON product_assumptions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "product_assumptions_delete" ON product_assumptions FOR DELETE USING (user_id = auth.uid());

-- product_evidence
CREATE POLICY "product_evidence_select" ON product_evidence FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "product_evidence_insert" ON product_evidence FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);
CREATE POLICY "product_evidence_update" ON product_evidence FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "product_evidence_delete" ON product_evidence FOR DELETE USING (user_id = auth.uid());

-- product_decision_evidence_links
CREATE POLICY "product_decision_evidence_links_select" ON product_decision_evidence_links FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "product_decision_evidence_links_insert" ON product_decision_evidence_links FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);
CREATE POLICY "product_decision_evidence_links_delete" ON product_decision_evidence_links FOR DELETE USING (user_id = auth.uid());

-- product_decision_agent_reviews
CREATE POLICY "product_decision_agent_reviews_select" ON product_decision_agent_reviews FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "product_decision_agent_reviews_insert" ON product_decision_agent_reviews FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

-- product_decision_recommendations
CREATE POLICY "product_decision_recommendations_select" ON product_decision_recommendations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "product_decision_recommendations_insert" ON product_decision_recommendations FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════

-- updated_at trigger function (create if not exists)
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_decisions_updated_at
  BEFORE UPDATE ON product_decisions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER trg_product_decision_options_updated_at
  BEFORE UPDATE ON product_decision_options
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER trg_product_assumptions_updated_at
  BEFORE UPDATE ON product_assumptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER trg_product_evidence_updated_at
  BEFORE UPDATE ON product_evidence
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- Validate selected_option_id belongs to the same decision
CREATE OR REPLACE FUNCTION validate_selected_option_belongs_to_decision()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.selected_option_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM product_decision_options
      WHERE id = NEW.selected_option_id AND decision_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'selected_option_id does not belong to this decision';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_selected_option
  BEFORE INSERT OR UPDATE ON product_decisions
  FOR EACH ROW EXECUTE FUNCTION validate_selected_option_belongs_to_decision();
