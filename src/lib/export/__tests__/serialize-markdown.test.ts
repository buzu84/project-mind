import { describe, it, expect } from "vitest";
import type { ParsedMultiAgentReview, ParsedAgentResponse, ParsedRoadmap, ParsedRoadmapItem } from "@/lib/validation/json-parsers";
import {
  decisionReviewToMarkdown,
  multiAgentReviewToMarkdown,
  roadmapToMarkdown,
  insightsToMarkdown,
  prdToMarkdown,
  analysisToMarkdown,
} from "../serialize-markdown";

// ── Shared helpers ──────────────────────────────────────────────────

/**
 * Assert serializer output has no metadata/field-level text pollution.
 * Only safe to use with controlled fixture content — do NOT use on output
 * containing arbitrary user/AI body text where "null" or "undefined"
 * could be legitimate prose.
 */
function expectCleanOutput(output: string) {
  expect(output).not.toContain("undefined");
  expect(output).not.toContain("null");
  expect(output).not.toMatch(/^```/m); // no fenced code wrapping full output
}

// ── Fixture factories ───────────────────────────────────────────────

function makeAgentResponse(overrides?: Partial<ParsedAgentResponse>): ParsedAgentResponse {
  return {
    summary: "Agent summary text.",
    key_points: ["Key point 1"],
    concerns: ["Concern 1"],
    recommendations: ["Recommendation 1"],
    confidence: 0.85,
    ...overrides,
  };
}

function makeMultiAgentReview(overrides?: Partial<ParsedMultiAgentReview>): ParsedMultiAgentReview {
  return {
    id: "review-1",
    project_id: "proj-1",
    question: "Should we build feature X?",
    input_type: "feature_idea",
    pm_response: makeAgentResponse(),
    cto_response: makeAgentResponse(),
    ux_response: makeAgentResponse(),
    growth_response: makeAgentResponse(),
    consensus: {
      recommendation: "recommend",
      summary: "Overall we recommend proceeding.",
      disagreements: ["Minor disagreement on timeline"],
      risks: ["Market timing risk"],
      next_steps: ["Validate with users", "Build prototype"],
      overall_confidence: 0.8,
    },
    model: "gpt-4o",
    is_mock: false,
    created_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

function makeRoadmapItem(title: string, overrides?: Partial<ParsedRoadmapItem>): ParsedRoadmapItem {
  return { title, description: `Description for ${title}`, ...overrides };
}

function makeRoadmap(overrides?: Partial<ParsedRoadmap>): ParsedRoadmap {
  return {
    id: "roadmap-1",
    project_id: "proj-1",
    title: "Q3 Product Roadmap",
    now_items: [makeRoadmapItem("Now Item 1")],
    next_items: [makeRoadmapItem("Next Item 1")],
    later_items: [makeRoadmapItem("Later Item 1")],
    plan_30_days: [],
    plan_60_days: [],
    plan_90_days: [],
    risks: [],
    dependencies: [],
    success_metrics: [],
    is_mock: false,
    created_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// decisionReviewToMarkdown
// ═══════════════════════════════════════════════════════════════════

describe("decisionReviewToMarkdown", () => {
  function makeDecisionData() {
    return {
      title: "Launch Mobile App",
      status: "in_progress",
      category: "Product",
      confidenceScore: 82,
      problemStatement: "Users need mobile access.",
      contextSummary: "Market research shows 60% mobile usage.",
      recommendation: {
        recommendation: "Proceed with React Native approach.",
        confidence_score: 85,
        reasoning: ["Cost effective", "Shared codebase"],
        next_validation_steps: ["Build prototype", "User testing"],
      },
      options: [
        {
          title: "React Native",
          description: "Cross-platform framework.",
          pros: ["Shared code", "Fast dev"],
          cons: ["Performance limits"],
          effort_estimate: "medium",
          reversibility: "high",
          confidence_score: 85,
        },
      ],
      assumptions: [
        {
          statement: "Users prefer mobile apps over web",
          assumption_type: "user",
          risk_level: "medium",
          evidence_status: "moderate",
          validation_method: "User survey",
        },
      ],
      evidence: [
        {
          title: "Mobile Usage Report",
          claim: "60% of users access via mobile",
          source_type: "analytics",
        },
      ],
    };
  }

  it("produces non-empty output with correct heading", () => {
    const output = decisionReviewToMarkdown(makeDecisionData());
    expect(output).toContain("# Decision Review: Launch Mobile App");
    expect(output.length).toBeGreaterThan(100);
  });

  it("includes metadata fields", () => {
    const output = decisionReviewToMarkdown(makeDecisionData());
    expect(output).toContain("**Status:** in progress");
    expect(output).toContain("**Category:** Product");
    expect(output).toContain("**Confidence:** 82%");
  });

  it("includes all major sections", () => {
    const output = decisionReviewToMarkdown(makeDecisionData());
    expect(output).toContain("## Problem Statement");
    expect(output).toContain("## Context");
    expect(output).toContain("## Recommendation");
    expect(output).toContain("## Decision Options");
    expect(output).toContain("## Assumptions");
    expect(output).toContain("## Evidence");
  });

  it("includes recommendation details", () => {
    const output = decisionReviewToMarkdown(makeDecisionData());
    expect(output).toContain("Proceed with React Native approach.");
    expect(output).toContain("*Confidence: 85%*");
    expect(output).toContain("### Reasoning");
    expect(output).toContain("- Cost effective");
    expect(output).toContain("### Next Steps");
    expect(output).toContain("- Build prototype");
  });

  it("renders option with pros and cons", () => {
    const output = decisionReviewToMarkdown(makeDecisionData());
    expect(output).toContain("### Option 1: React Native");
    expect(output).toContain("**Pros:**");
    expect(output).toContain("- Shared code");
    expect(output).toContain("**Cons:**");
    expect(output).toContain("- Performance limits");
  });

  it("renders assumptions with tags", () => {
    const output = decisionReviewToMarkdown(makeDecisionData());
    expect(output).toContain("Users prefer mobile apps over web");
    expect(output).toContain("user");
    expect(output).toContain("medium risk");
    expect(output).toContain("Validation: User survey");
  });

  it("renders evidence", () => {
    const output = decisionReviewToMarkdown(makeDecisionData());
    expect(output).toContain("**Mobile Usage Report**");
    expect(output).toContain("60% of users access via mobile");
  });

  it("omits optional sections when data is missing", () => {
    const output = decisionReviewToMarkdown({
      title: "Minimal Decision",
      status: "draft",
      category: "Engineering",
      confidenceScore: null,
      problemStatement: null,
      contextSummary: null,
      recommendation: null,
      options: [],
      assumptions: [],
      evidence: [],
    });
    expect(output).toContain("# Decision Review: Minimal Decision");
    expect(output).not.toContain("**Confidence:**");
    expect(output).not.toContain("## Problem Statement");
    expect(output).not.toContain("## Context");
    expect(output).not.toContain("## Recommendation");
    expect(output).not.toContain("## Decision Options");
    expect(output).not.toContain("## Assumptions");
    expect(output).not.toContain("## Evidence");
  });

  it("handles string reasoning (legacy format)", () => {
    // Production interface allows `reasoning: string | string[]`.
    // Build input directly with string reasoning to test the split branch.
    const data = {
      ...makeDecisionData(),
      recommendation: {
        recommendation: "Proceed with React Native approach.",
        confidence_score: 85,
        reasoning: "Single reason line\nSecond reason" as string | string[],
        next_validation_steps: ["Build prototype"],
      },
    };
    const output = decisionReviewToMarkdown(data);
    expect(output).toContain("### Reasoning");
    expect(output).toContain("- Single reason line");
    expect(output).toContain("- Second reason");
  });

  it("omits reversibility when unknown", () => {
    const data = makeDecisionData();
    data.options[0].reversibility = "unknown";
    const output = decisionReviewToMarkdown(data);
    expect(output).not.toContain("**Reversibility:**");
  });

  it("produces clean output", () => {
    expectCleanOutput(decisionReviewToMarkdown(makeDecisionData()));
  });

  it("does not mutate input", () => {
    const data = makeDecisionData();
    const optionsBefore = [...data.options];
    const assumptionsBefore = [...data.assumptions];
    decisionReviewToMarkdown(data);
    expect(data.options).toEqual(optionsBefore);
    expect(data.assumptions).toEqual(assumptionsBefore);
  });
});

// ═══════════════════════════════════════════════════════════════════
// multiAgentReviewToMarkdown
// ═══════════════════════════════════════════════════════════════════

describe("multiAgentReviewToMarkdown", () => {
  it("produces output with correct heading", () => {
    const output = multiAgentReviewToMarkdown(makeMultiAgentReview());
    expect(output).toContain("# Multi-Agent Review");
  });

  it("includes review topic and metadata", () => {
    const output = multiAgentReviewToMarkdown(makeMultiAgentReview());
    expect(output).toContain("## Review Topic");
    expect(output).toContain("Should we build feature X?");
    expect(output).toContain("**Type:** Feature Idea");
    expect(output).toContain("**Generated:**");
  });

  it("includes project name when provided", () => {
    const output = multiAgentReviewToMarkdown(makeMultiAgentReview(), "Acme App");
    expect(output).toContain("## Project");
    expect(output).toContain("Acme App");
  });

  it("omits project section when not provided", () => {
    const output = multiAgentReviewToMarkdown(makeMultiAgentReview());
    expect(output).not.toContain("## Project");
  });

  it("includes all four agent perspectives", () => {
    const output = multiAgentReviewToMarkdown(makeMultiAgentReview());
    expect(output).toContain("## Agent Perspectives");
    expect(output).toContain("Product Manager");
    expect(output).toContain("CTO");
    expect(output).toContain("UX Researcher");
    expect(output).toContain("Growth Marketer");
  });

  it("renders agent confidence as percentage", () => {
    const output = multiAgentReviewToMarkdown(makeMultiAgentReview());
    expect(output).toContain("*Confidence: 85%*");
  });

  it("includes consensus section", () => {
    const output = multiAgentReviewToMarkdown(makeMultiAgentReview());
    expect(output).toContain("## Consensus");
    expect(output).toContain("**Recommendation:** Recommend");
    expect(output).toContain("**Overall Confidence:** 80%");
    expect(output).toContain("Overall we recommend proceeding.");
  });

  it("includes consensus disagreements, risks, and next steps", () => {
    const output = multiAgentReviewToMarkdown(makeMultiAgentReview());
    expect(output).toContain("### Disagreements");
    expect(output).toContain("- Minor disagreement on timeline");
    expect(output).toContain("### Risks");
    expect(output).toContain("- Market timing risk");
    expect(output).toContain("### Next Steps");
    expect(output).toContain("1. Validate with users");
  });

  it("omits empty consensus sub-sections", () => {
    const review = makeMultiAgentReview();
    review.consensus.disagreements = [];
    review.consensus.risks = [];
    review.consensus.next_steps = [];
    const output = multiAgentReviewToMarkdown(review);
    expect(output).not.toContain("### Disagreements");
    expect(output).not.toContain("### Risks");
    expect(output).not.toContain("### Next Steps");
  });

  it("handles agent with empty arrays", () => {
    const review = makeMultiAgentReview({
      pm_response: makeAgentResponse({
        key_points: [],
        concerns: [],
        recommendations: [],
      }),
    });
    const output = multiAgentReviewToMarkdown(review);
    expect(output).toContain("Product Manager");
    expectCleanOutput(output);
  });

  it("renders product_question input type", () => {
    const review = makeMultiAgentReview({ input_type: "product_question" });
    const output = multiAgentReviewToMarkdown(review);
    expect(output).toContain("**Type:** Product Question");
  });

  it("produces clean output", () => {
    expectCleanOutput(multiAgentReviewToMarkdown(makeMultiAgentReview()));
  });
});

// ═══════════════════════════════════════════════════════════════════
// roadmapToMarkdown
// ═══════════════════════════════════════════════════════════════════

describe("roadmapToMarkdown", () => {
  it("produces output with correct heading (with project name)", () => {
    const output = roadmapToMarkdown(makeRoadmap(), "Acme App");
    expect(output).toContain("# AI Roadmap — Acme App");
  });

  it("produces heading without project name", () => {
    const output = roadmapToMarkdown(makeRoadmap());
    expect(output).toMatch(/^# AI Roadmap\n/);
    // heading line itself should not contain project name separator
    const headingLine = output.split("\n")[0];
    expect(headingLine).toBe("# AI Roadmap");
  });

  it("includes title and generated date", () => {
    const output = roadmapToMarkdown(makeRoadmap());
    expect(output).toContain("**Q3 Product Roadmap**");
    expect(output).toContain("**Generated:**");
  });

  it("includes Now/Next/Later sections when items exist", () => {
    const output = roadmapToMarkdown(makeRoadmap());
    expect(output).toContain("## Priority Horizons");
    expect(output).toContain("### Now");
    expect(output).toContain("### Next");
    expect(output).toContain("### Later");
    expect(output).toContain("**Now Item 1**");
  });

  it("omits Priority Horizons when all empty", () => {
    const roadmap = makeRoadmap({
      now_items: [],
      next_items: [],
      later_items: [],
    });
    const output = roadmapToMarkdown(roadmap);
    expect(output).not.toContain("## Priority Horizons");
  });

  it("includes 30/60/90 day plan when items exist", () => {
    const roadmap = makeRoadmap({
      plan_30_days: [makeRoadmapItem("Sprint 1")],
      plan_60_days: [makeRoadmapItem("Sprint 3")],
      plan_90_days: [makeRoadmapItem("Sprint 5")],
    });
    const output = roadmapToMarkdown(roadmap);
    expect(output).toContain("## 30 / 60 / 90 Day Plan");
    expect(output).toContain("### First 30 Days");
    expect(output).toContain("### Days 31–60");
    expect(output).toContain("### Days 61–90");
  });

  it("includes Risks/Dependencies/Success Metrics when present", () => {
    const roadmap = makeRoadmap({
      risks: [makeRoadmapItem("Risk 1")],
      dependencies: [makeRoadmapItem("Dep 1")],
      success_metrics: [makeRoadmapItem("Metric 1")],
    });
    const output = roadmapToMarkdown(roadmap);
    expect(output).toContain("## Risks");
    expect(output).toContain("## Dependencies");
    expect(output).toContain("## Success Metrics");
  });

  it("omits Risks/Dependencies/Metrics sections when empty", () => {
    const output = roadmapToMarkdown(makeRoadmap());
    expect(output).not.toContain("## Risks");
    expect(output).not.toContain("## Dependencies");
    expect(output).not.toContain("## Success Metrics");
  });

  it("renders item with priority and confidence tags", () => {
    const roadmap = makeRoadmap({
      now_items: [makeRoadmapItem("Tagged Item", { priority: "high", confidence: "high" })],
    });
    const output = roadmapToMarkdown(roadmap);
    expect(output).toContain("*(high · confidence: high)*");
  });

  it("renders item without optional tags", () => {
    const roadmap = makeRoadmap({
      now_items: [{ title: "Plain Item", description: "No tags" }],
    });
    const output = roadmapToMarkdown(roadmap);
    expect(output).toContain("**Plain Item** — No tags");
    expect(output).not.toContain("*(");
  });

  it("produces clean output", () => {
    expectCleanOutput(roadmapToMarkdown(makeRoadmap()));
  });
});

// ═══════════════════════════════════════════════════════════════════
// insightsToMarkdown
// ═══════════════════════════════════════════════════════════════════

describe("insightsToMarkdown", () => {
  function makeInsight(overrides?: Record<string, unknown>) {
    return {
      type: "risk",
      title: "Market Timing Risk",
      content: "The market window may close by Q4.",
      metadata: {
        priority: "high",
        confidence: "medium",
        suggested_action: "Accelerate launch timeline",
      },
      ...overrides,
    };
  }

  it("produces output with correct heading", () => {
    const output = insightsToMarkdown([makeInsight()], "Acme App");
    expect(output).toContain("# AI Insights — Acme App");
  });

  it("returns empty string for empty insights array", () => {
    expect(insightsToMarkdown([], "Acme App")).toBe("");
  });

  it("renders insight with type label, priority, and confidence", () => {
    const output = insightsToMarkdown([makeInsight()], "Acme App");
    expect(output).toContain("## Market Timing Risk");
    expect(output).toContain("**Type:** Risk");
    expect(output).toContain("**Priority:** high");
    expect(output).toContain("**Confidence:** medium");
  });

  it("renders insight content and suggested action", () => {
    const output = insightsToMarkdown([makeInsight()], "Acme App");
    expect(output).toContain("The market window may close by Q4.");
    expect(output).toContain("🎯 **Suggested action:** Accelerate launch timeline");
  });

  it("handles insight with null metadata", () => {
    const output = insightsToMarkdown([makeInsight({ metadata: null })], "Acme App");
    expect(output).toContain("## Market Timing Risk");
    expect(output).toContain("**Priority:** medium"); // default
    expect(output).not.toContain("**Confidence:**");
    expectCleanOutput(output);
  });

  it("handles unknown insight type gracefully", () => {
    const output = insightsToMarkdown([makeInsight({ type: "custom_type" })], "Acme App");
    expect(output).toContain("**Type:** custom_type");
  });

  it("maps known insight types to labels", () => {
    const types: [string, string][] = [
      ["risk", "Risk"],
      ["opportunity", "Opportunity"],
      ["next_action", "Next Action"],
      ["pain_point", "Pain Point"],
      ["strategic_gap", "Strategic Gap"],
    ];
    for (const [type, label] of types) {
      const output = insightsToMarkdown([makeInsight({ type })], "Test");
      expect(output).toContain(`**Type:** ${label}`);
    }
  });

  it("renders multiple insights", () => {
    const insights = [
      makeInsight({ title: "Insight A" }),
      makeInsight({ title: "Insight B", type: "opportunity" }),
    ];
    const output = insightsToMarkdown(insights, "Acme App");
    expect(output).toContain("## Insight A");
    expect(output).toContain("## Insight B");
  });

  it("produces clean output", () => {
    expectCleanOutput(insightsToMarkdown([makeInsight()], "Acme App"));
  });
});

// ═══════════════════════════════════════════════════════════════════
// prdToMarkdown
// ═══════════════════════════════════════════════════════════════════

describe("prdToMarkdown", () => {
  function makePrdData() {
    return {
      productName: "Acme Widget",
      targetAudience: "Small business owners",
      createdAt: "2026-01-15T10:00:00Z",
      content: "## Overview\n\nThis PRD outlines the widget feature.",
    };
  }

  it("produces output with correct heading", () => {
    const output = prdToMarkdown(makePrdData());
    expect(output).toContain("# PRD: Acme Widget");
  });

  it("includes metadata fields", () => {
    const output = prdToMarkdown(makePrdData());
    expect(output).toContain("**Type:** PRD");
    expect(output).toContain("**Target Audience:** Small business owners");
    expect(output).toContain("**Generated:**");
  });

  it("omits target audience when null", () => {
    const output = prdToMarkdown({ ...makePrdData(), targetAudience: null });
    expect(output).not.toContain("**Target Audience:**");
  });

  it("omits target audience when empty string", () => {
    const output = prdToMarkdown({ ...makePrdData(), targetAudience: "" });
    expect(output).not.toContain("**Target Audience:**");
  });

  it("preserves PRD body content", () => {
    const output = prdToMarkdown(makePrdData());
    expect(output).toContain("## Overview");
    expect(output).toContain("This PRD outlines the widget feature.");
  });

  it("does not strip or demote headings in body content", () => {
    // Serializer prepends its own "# PRD: ..." heading and preserves body as-is.
    // AI prompts are responsible for using ## sections in body content.
    // Serializer must NOT sanitize, demote, or strip headings inside the body.
    const data = { ...makePrdData(), content: "# Existing H1\n\nBody text." };
    const output = prdToMarkdown(data);
    expect(output).toContain("# PRD: Acme Widget");
    expect(output).toContain("# Existing H1");
  });

  it("produces clean output", () => {
    expectCleanOutput(prdToMarkdown(makePrdData()));
  });
});

// ═══════════════════════════════════════════════════════════════════
// analysisToMarkdown
// ═══════════════════════════════════════════════════════════════════

describe("analysisToMarkdown", () => {
  function makeAnalysisData() {
    return {
      productName: "Acme Widget",
      competitors: "Competitor A, Competitor B",
      industry: "SaaS",
      createdAt: "2026-01-15T10:00:00Z",
      content: "## Market Overview\n\nThe SaaS market is growing.",
    };
  }

  it("produces output with correct heading", () => {
    const output = analysisToMarkdown(makeAnalysisData());
    expect(output).toContain("# Competitive Analysis: Acme Widget");
  });

  it("includes metadata fields", () => {
    const output = analysisToMarkdown(makeAnalysisData());
    expect(output).toContain("**Type:** Competitive Analysis");
    expect(output).toContain("**Competitors:** Competitor A, Competitor B");
    expect(output).toContain("**Industry:** SaaS");
    expect(output).toContain("**Generated:**");
  });

  it("omits competitors when null", () => {
    const output = analysisToMarkdown({ ...makeAnalysisData(), competitors: null });
    expect(output).not.toContain("**Competitors:**");
  });

  it("omits industry when null", () => {
    const output = analysisToMarkdown({ ...makeAnalysisData(), industry: null });
    expect(output).not.toContain("**Industry:**");
  });

  it("omits competitors when empty string", () => {
    const output = analysisToMarkdown({ ...makeAnalysisData(), competitors: "" });
    expect(output).not.toContain("**Competitors:**");
  });

  it("omits industry when empty string", () => {
    const output = analysisToMarkdown({ ...makeAnalysisData(), industry: "" });
    expect(output).not.toContain("**Industry:**");
  });

  it("preserves analysis body content", () => {
    const output = analysisToMarkdown(makeAnalysisData());
    expect(output).toContain("## Market Overview");
    expect(output).toContain("The SaaS market is growing.");
  });

  it("does not strip or demote headings in body content", () => {
    // Same contract as PRD: serializer preserves body as-is.
    const data = { ...makeAnalysisData(), content: "# Existing H1\n\nBody text." };
    const output = analysisToMarkdown(data);
    expect(output).toContain("# Competitive Analysis: Acme Widget");
    expect(output).toContain("# Existing H1");
  });

  it("produces clean output", () => {
    expectCleanOutput(analysisToMarkdown(makeAnalysisData()));
  });
});


