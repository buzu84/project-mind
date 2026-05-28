/**
 * Decision Engine view-models.
 *
 * These reshape generated Supabase DB row types into UI-ready shapes,
 * parsing JSONB arrays at the server/page boundary so client components
 * receive fully typed, safe data.
 *
 * Rules:
 *  - DB row types come ONLY from Tables<"...">
 *  - JSONB fields are parsed via parseJsonStringArray
 *  - View-models narrow nullable fields for UI convenience
 *  - No handwritten DB row interfaces
 */

import type { Tables } from "@/lib/supabase/types";
import { parseJsonStringArray } from "@/lib/validation/json-parsers";

// ── Raw DB row types ────────────────────────────────────────────────

type ProductDecisionRow = Tables<"product_decisions">;
type OptionRow = Tables<"product_decision_options">;
type AssumptionRow = Tables<"product_assumptions">;
type RecommendationRow = Tables<"product_decision_recommendations">;
type EvidenceLinkRow = Tables<"product_decision_evidence_links">;
type EvidenceRow = Tables<"product_evidence">;

// ── View-models ─────────────────────────────────────────────────────

export interface DecisionViewModel {
  id: string;
  title: string;
  status: string;
  category: string;
  confidence_score: number | null;
  problem_statement: string | null;
  context_summary: string | null;
  updated_at: string;
}

export interface OptionViewModel {
  id: string;
  title: string;
  description: string | null;
  pros: string[];
  cons: string[];
  effort_estimate: string | null;
  reversibility: string | null;
  confidence_score: number | null;
}

export interface AssumptionViewModel {
  id: string;
  statement: string;
  assumption_type: string;
  risk_level: string;
  evidence_status: string | null;
  validation_method: string | null;
}

export interface RecommendationViewModel {
  recommendation: string;
  confidence_score: number | null;
  reasoning: string[];
  next_validation_steps: string[];
  created_at: string;
}

export interface EvidenceLinkViewModel {
  id: string;
  evidence: {
    title: string | null;
    claim: string;
    source_type: string;
    relevance_score: number | null;
  };
}

// ── Parsers ─────────────────────────────────────────────────────────

export function toDecisionViewModel(row: ProductDecisionRow): DecisionViewModel {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    category: row.category,
    confidence_score: row.confidence_score,
    problem_statement: row.problem_statement,
    context_summary: row.context_summary,
    updated_at: row.updated_at,
  };
}

export function toOptionViewModel(row: OptionRow): OptionViewModel {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    pros: parseJsonStringArray(row.pros),
    cons: parseJsonStringArray(row.cons),
    effort_estimate: row.effort_estimate,
    reversibility: row.reversibility,
    confidence_score: row.confidence_score,
  };
}

export function toAssumptionViewModel(row: AssumptionRow): AssumptionViewModel {
  return {
    id: row.id,
    statement: row.statement,
    assumption_type: row.assumption_type,
    risk_level: row.risk_level,
    evidence_status: row.evidence_status,
    validation_method: row.validation_method,
  };
}

export function toRecommendationViewModel(row: RecommendationRow): RecommendationViewModel {
  const reasoningRaw = row.reasoning;
  const reasoning: string[] =
    typeof reasoningRaw === "string" && reasoningRaw.trim()
      ? reasoningRaw.split("\n").filter(Boolean)
      : [];

  return {
    recommendation: row.recommendation ?? "",
    confidence_score: row.confidence_score,
    reasoning,
    next_validation_steps: parseJsonStringArray(row.next_validation_steps),
    created_at: row.created_at,
  };
}

export function toEvidenceLinkViewModel(
  row: EvidenceLinkRow & { product_evidence: EvidenceRow | null },
): EvidenceLinkViewModel {
  const ev = row.product_evidence;
  return {
    id: row.id,
    evidence: {
      title: ev?.title ?? null,
      claim: ev?.claim ?? "",
      source_type: ev?.source_type ?? "unknown",
      relevance_score: ev?.relevance_score ?? null,
    },
  };
}

