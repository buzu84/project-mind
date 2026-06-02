import { describe, it, expect } from "vitest";
import type { Tables } from "@/lib/supabase/types";
import {
  toDecisionViewModel,
  toOptionViewModel,
  toAssumptionViewModel,
  toRecommendationViewModel,
  toEvidenceLinkViewModel,
} from "../decision-view-models";

// ── Factory helpers ─────────────────────────────────────────────────

function makeDecisionRow(
  overrides: Partial<Tables<"product_decisions">> = {},
): Tables<"product_decisions"> {
  return {
    id: "dec-1",
    title: "Launch mobile app",
    status: "open",
    category: "product",
    confidence_score: 75,
    problem_statement: "Users need mobile access",
    context_summary: "Market research shows 60% mobile usage",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
    project_id: "proj-1",
    user_id: "user-1",
    deadline: null,
    effort_estimate: null,
    reversibility: null,
    selected_option_id: null,
    ...overrides,
  };
}

function makeOptionRow(
  overrides: Partial<Tables<"product_decision_options">> = {},
): Tables<"product_decision_options"> {
  return {
    id: "opt-1",
    title: "Option A",
    description: "Build native apps",
    pros: ["Fast performance", "Native feel"],
    cons: ["Higher cost", "Two codebases"],
    risks: null,
    effort_estimate: "high",
    reversibility: "low",
    confidence_score: 70,
    expected_impact: null,
    risk_level: null,
    generated_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    decision_id: "dec-1",
    project_id: "proj-1",
    user_id: "user-1",
    ...overrides,
  };
}

function makeAssumptionRow(
  overrides: Partial<Tables<"product_assumptions">> = {},
): Tables<"product_assumptions"> {
  return {
    id: "asm-1",
    statement: "Users want mobile access",
    assumption_type: "user",
    risk_level: "medium",
    evidence_status: "weak",
    validation_method: "User interviews",
    status: "untested",
    type: null,
    result: null,
    generated_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    decision_id: "dec-1",
    project_id: "proj-1",
    user_id: "user-1",
    ...overrides,
  };
}

function makeRecommendationRow(
  overrides: Partial<Tables<"product_decision_recommendations">> = {},
): Tables<"product_decision_recommendations"> {
  return {
    id: "rec-1",
    recommendation: "Go with phased rollout",
    confidence_score: 75,
    reasoning: "Lower risk\nEarly validation\nFaster time to market",
    summary: null,
    next_steps: null,
    next_validation_steps: ["Interview 5 users", "Build prototype"],
    supporting_evidence: null,
    assumptions: null,
    risks: null,
    alternatives: null,
    recommended_option_id: null,
    risk_assessment: null,
    generated_by: null,
    created_at: "2026-01-01T00:00:00Z",
    decision_id: "dec-1",
    project_id: "proj-1",
    user_id: "user-1",
    ...overrides,
  };
}

function makeEvidenceLinkRow(
  overrides: Partial<Tables<"product_decision_evidence_links">> = {},
): Tables<"product_decision_evidence_links"> {
  return {
    id: "link-1",
    decision_id: "dec-1",
    evidence_id: "ev-1",
    link_type: "informs",
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    project_id: "proj-1",
    user_id: "user-1",
    ...overrides,
  };
}

function makeEvidenceRow(
  overrides: Partial<Tables<"product_evidence">> = {},
): Tables<"product_evidence"> {
  return {
    id: "ev-1",
    title: "User survey results",
    claim: "60% of users prefer mobile",
    content: null,
    source_type: "feedback",
    source_id: null,
    source_url: null,
    relevance_score: 0.85,
    status: "active",
    tags: null,
    generated_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    project_id: "proj-1",
    user_id: "user-1",
    ...overrides,
  };
}

// ── toDecisionViewModel ─────────────────────────────────────────────

describe("toDecisionViewModel", () => {
  it("maps all fields from a complete decision row", () => {
    const row = makeDecisionRow();
    const vm = toDecisionViewModel(row);

    expect(vm.id).toBe("dec-1");
    expect(vm.title).toBe("Launch mobile app");
    expect(vm.status).toBe("open");
    expect(vm.category).toBe("product");
    expect(vm.confidence_score).toBe(75);
    expect(vm.problem_statement).toBe("Users need mobile access");
    expect(vm.context_summary).toContain("60% mobile");
    expect(vm.updated_at).toBe("2026-01-15T00:00:00Z");
  });
});

// ── toOptionViewModel ───────────────────────────────────────────────

describe("toOptionViewModel", () => {
  it("parses JSONB pros and cons into string arrays", () => {
    const row = makeOptionRow({
      pros: ["Fast", "Reliable"],
      cons: ["Expensive"],
    });
    const vm = toOptionViewModel(row);

    expect(vm.pros).toEqual(["Fast", "Reliable"]);
    expect(vm.cons).toEqual(["Expensive"]);
  });

  it("returns empty arrays when pros and cons are null", () => {
    const row = makeOptionRow({ pros: null, cons: null });
    const vm = toOptionViewModel(row);

    expect(vm.pros).toEqual([]);
    expect(vm.cons).toEqual([]);
  });
});

// ── toAssumptionViewModel ───────────────────────────────────────────

describe("toAssumptionViewModel", () => {
  it("maps all fields from a complete assumption row", () => {
    const row = makeAssumptionRow();
    const vm = toAssumptionViewModel(row);

    expect(vm.id).toBe("asm-1");
    expect(vm.statement).toBe("Users want mobile access");
    expect(vm.assumption_type).toBe("user");
    expect(vm.risk_level).toBe("medium");
    expect(vm.evidence_status).toBe("weak");
    expect(vm.validation_method).toBe("User interviews");
  });
});

// ── toRecommendationViewModel ───────────────────────────────────────

describe("toRecommendationViewModel", () => {
  it("splits multi-line reasoning into array", () => {
    const row = makeRecommendationRow({
      reasoning: "Lower risk\nEarly validation\nFaster launch",
    });
    const vm = toRecommendationViewModel(row);

    expect(vm.reasoning).toEqual([
      "Lower risk",
      "Early validation",
      "Faster launch",
    ]);
  });

  it("returns single-element array for single-line reasoning", () => {
    const row = makeRecommendationRow({ reasoning: "Only one reason" });
    const vm = toRecommendationViewModel(row);

    expect(vm.reasoning).toEqual(["Only one reason"]);
  });

  it("returns empty array for null reasoning", () => {
    const row = makeRecommendationRow({ reasoning: null });
    const vm = toRecommendationViewModel(row);

    expect(vm.reasoning).toEqual([]);
  });

  it("returns empty array for empty string reasoning", () => {
    const row = makeRecommendationRow({ reasoning: "" });
    const vm = toRecommendationViewModel(row);

    expect(vm.reasoning).toEqual([]);
  });

  it("filters out empty lines from reasoning", () => {
    const row = makeRecommendationRow({
      reasoning: "First\n\nSecond\n\nThird",
    });
    const vm = toRecommendationViewModel(row);

    expect(vm.reasoning).toEqual(["First", "Second", "Third"]);
  });

  it("falls back to empty string when recommendation is null", () => {
    const row = makeRecommendationRow({ recommendation: null });
    const vm = toRecommendationViewModel(row);

    expect(vm.recommendation).toBe("");
  });

  it("parses JSONB next_validation_steps", () => {
    const row = makeRecommendationRow({
      next_validation_steps: ["Step A", "Step B"],
    });
    const vm = toRecommendationViewModel(row);

    expect(vm.next_validation_steps).toEqual(["Step A", "Step B"]);
  });

  it("returns empty array when next_validation_steps is null", () => {
    const row = makeRecommendationRow({ next_validation_steps: null });
    const vm = toRecommendationViewModel(row);

    expect(vm.next_validation_steps).toEqual([]);
  });
});

// ── toEvidenceLinkViewModel ─────────────────────────────────────────

describe("toEvidenceLinkViewModel", () => {
  it("maps evidence fields from a joined evidence row", () => {
    const row = {
      ...makeEvidenceLinkRow(),
      product_evidence: makeEvidenceRow(),
    };
    const vm = toEvidenceLinkViewModel(row);

    expect(vm.id).toBe("link-1");
    expect(vm.evidence.title).toBe("User survey results");
    expect(vm.evidence.claim).toBe("60% of users prefer mobile");
    expect(vm.evidence.source_type).toBe("feedback");
    expect(vm.evidence.relevance_score).toBe(0.85);
  });

  it("returns fallback defaults when product_evidence is null", () => {
    const row = {
      ...makeEvidenceLinkRow(),
      product_evidence: null,
    };
    const vm = toEvidenceLinkViewModel(row);

    expect(vm.id).toBe("link-1");
    expect(vm.evidence.title).toBeNull();
    expect(vm.evidence.claim).toBe("");
    expect(vm.evidence.source_type).toBe("unknown");
    expect(vm.evidence.relevance_score).toBeNull();
  });

  it("handles partial evidence with null fields", () => {
    const row = {
      ...makeEvidenceLinkRow(),
      product_evidence: makeEvidenceRow({
        title: null,
        claim: null,
        relevance_score: null,
      }),
    };
    const vm = toEvidenceLinkViewModel(row);

    expect(vm.evidence.title).toBeNull();
    expect(vm.evidence.claim).toBe("");
    expect(vm.evidence.source_type).toBe("feedback");
    expect(vm.evidence.relevance_score).toBeNull();
  });
});

