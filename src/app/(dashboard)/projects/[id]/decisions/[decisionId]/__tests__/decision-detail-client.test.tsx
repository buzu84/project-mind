// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ToastProvider } from "@/components/ui/toast";
import { DecisionDetailClient } from "../decision-detail-client";
import type {
  DecisionViewModel,
  OptionViewModel,
  AssumptionViewModel,
  RecommendationViewModel,
  EvidenceLinkViewModel,
} from "../decision-view-models";

// ── Mocks ───────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// ── Fixture factories ───────────────────────────────────────────────

function makeDecision(overrides: Partial<DecisionViewModel> = {}): DecisionViewModel {
  return {
    id: "dec-1",
    title: "Should we migrate to Next 15?",
    status: "draft",
    category: "technical",
    confidence_score: null,
    problem_statement: "We need to decide whether to upgrade.",
    context_summary: "Current stack is Next 14.",
    updated_at: "2026-05-01T10:00:00Z",
    ...overrides,
  };
}

function makeOption(overrides: Partial<OptionViewModel> = {}): OptionViewModel {
  return {
    id: "opt-1",
    title: "Migrate incrementally",
    description: "Adopt the app router page by page.",
    pros: ["Low risk"],
    cons: ["Slow rollout"],
    effort_estimate: "medium",
    reversibility: "easy",
    confidence_score: 72,
    ...overrides,
  };
}

function makeAssumption(overrides: Partial<AssumptionViewModel> = {}): AssumptionViewModel {
  return {
    id: "asm-1",
    statement: "Team has capacity for migration",
    assumption_type: "resource",
    risk_level: "medium",
    evidence_status: "unsupported",
    validation_method: "Check sprint capacity",
    ...overrides,
  };
}

function makeRecommendation(
  overrides: Partial<RecommendationViewModel> = {},
): RecommendationViewModel {
  return {
    recommendation: "Proceed with incremental migration.",
    confidence_score: 80,
    reasoning: ["Lower risk than big-bang"],
    next_validation_steps: ["Run spike on one route"],
    created_at: "2026-05-01T10:00:00Z",
    ...overrides,
  };
}

function makeEvidenceLink(overrides: Partial<EvidenceLinkViewModel> = {}): EvidenceLinkViewModel {
  return {
    id: "ev-1",
    evidence: {
      title: "Next 15 release notes",
      claim: "Stable app router improvements",
      source_type: "documentation",
      relevance_score: 0.92,
    },
    ...overrides,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

interface RenderProps {
  decision?: DecisionViewModel;
  options?: OptionViewModel[];
  assumptions?: AssumptionViewModel[];
  recommendation?: RecommendationViewModel | null;
  evidenceLinks?: EvidenceLinkViewModel[];
}

function renderComponent(props: RenderProps = {}) {
  const {
    decision = makeDecision(),
    options = [],
    assumptions = [],
    recommendation = null,
    evidenceLinks = [],
  } = props;

  return render(
    <ToastProvider>
      <DecisionDetailClient
        projectId="proj-1"
        decision={decision}
        options={options}
        assumptions={assumptions}
        recommendation={recommendation}
        evidenceLinks={evidenceLinks}
      />
    </ToastProvider>,
  );
}

// ── Tests ───────────────────────────────────────────────────────────

describe("DecisionDetailClient", () => {
  afterEach(cleanup);

  it("renders empty analysis state with Analyze button and no Copy Markdown", () => {
    renderComponent();

    expect(screen.getByText("No analysis yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Analyze Decision/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Copy Markdown/i })).not.toBeInTheDocument();
  });

  it("renders full analysis with all sections visible", () => {
    renderComponent({
      recommendation: makeRecommendation(),
      options: [makeOption()],
      assumptions: [makeAssumption()],
      evidenceLinks: [makeEvidenceLink()],
    });

    // Decision title as heading
    expect(
      screen.getByRole("heading", { level: 1, name: /Should we migrate to Next 15\?/ }),
    ).toBeInTheDocument();

    // Recommendation section heading and body
    expect(screen.getByRole("heading", { name: /Recommendation/ })).toBeInTheDocument();
    expect(screen.getByText("Proceed with incremental migration.")).toBeInTheDocument();

    // Options section heading and representative content
    expect(screen.getByRole("heading", { name: "Decision Options" })).toBeInTheDocument();
    expect(screen.getByText("Migrate incrementally")).toBeInTheDocument();

    // Assumptions section heading and representative content
    expect(screen.getByRole("heading", { name: "Assumptions" })).toBeInTheDocument();
    expect(screen.getByText("Team has capacity for migration")).toBeInTheDocument();

    // Evidence section heading and representative content
    expect(screen.getByRole("heading", { name: "Evidence" })).toBeInTheDocument();
    expect(screen.getByText("Next 15 release notes")).toBeInTheDocument();

    // No empty state
    expect(screen.queryByText("No analysis yet")).not.toBeInTheDocument();
  });

  it("renders without crashing when optional fields are null", () => {
    renderComponent({
      decision: makeDecision({
        problem_statement: null,
        context_summary: null,
        confidence_score: null,
      }),
      options: [
        makeOption({
          description: null,
          effort_estimate: null,
          reversibility: null,
          confidence_score: null,
        }),
      ],
      assumptions: [makeAssumption({ evidence_status: null, validation_method: null })],
      recommendation: makeRecommendation({ confidence_score: null }),
      evidenceLinks: [
        makeEvidenceLink({
          evidence: {
            title: null,
            claim: "Some claim",
            source_type: "interview",
            relevance_score: null,
          },
        }),
      ],
    });

    // No literal "undefined" or "null" in visible text
    // Safe: all fixture strings are controlled and do not contain these words.
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/\bundefined\b/);
    expect(body).not.toMatch(/\bnull\b/);
  });

  it("shows 'Re-Analyze' when analysis exists", () => {
    renderComponent({ recommendation: makeRecommendation(), options: [makeOption()] });
    expect(screen.getByRole("button", { name: /Re-Analyze/i })).toBeInTheDocument();
  });

  it("shows Copy Markdown button when analysis exists", () => {
    renderComponent({ recommendation: makeRecommendation(), options: [makeOption()] });
    expect(screen.getByRole("button", { name: /Copy Markdown/i })).toBeInTheDocument();
  });

  it("shows stale analysis banner when decision was edited well after recommendation", () => {
    renderComponent({
      decision: makeDecision({ updated_at: "2026-05-02T12:00:00Z" }),
      recommendation: makeRecommendation({ created_at: "2026-05-01T10:00:00Z" }),
      options: [makeOption()],
    });

    expect(screen.getByText(/edited after the analysis/i)).toBeInTheDocument();
  });

  it("hides stale analysis banner when recommendation is current", () => {
    const now = "2026-05-01T10:00:00Z";
    renderComponent({
      decision: makeDecision({ updated_at: now }),
      recommendation: makeRecommendation({ created_at: now }),
      options: [makeOption()],
    });

    expect(screen.queryByText(/edited after the analysis/i)).not.toBeInTheDocument();
  });

  it("hides stale analysis banner at exactly 30s boundary (uses strict >)", () => {
    // decision.updated_at exactly 30s after recommendation.created_at
    // Component uses `> 30_000`, so 30s is NOT stale.
    renderComponent({
      decision: makeDecision({ updated_at: "2026-05-01T10:00:30Z" }),
      recommendation: makeRecommendation({ created_at: "2026-05-01T10:00:00Z" }),
      options: [makeOption()],
    });

    expect(screen.queryByText(/edited after the analysis/i)).not.toBeInTheDocument();
  });

  it("displays confidence score when present", () => {
    renderComponent({
      decision: makeDecision({ confidence_score: 85 }),
    });

    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it("renders status and category badges", () => {
    renderComponent({
      decision: makeDecision({ status: "under_review", category: "product" }),
    });

    expect(screen.getByText("under review")).toBeInTheDocument();
    expect(screen.getByText("product")).toBeInTheDocument();
  });
});
