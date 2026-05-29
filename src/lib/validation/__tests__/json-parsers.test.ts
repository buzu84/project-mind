import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parsePrdInput,
  parsePrdOutput,
  parseAnalysisInput,
  parseAnalysisOutput,
  parseDecisionInputTitle,
  parseRoadmapRow,
  parseMultiAgentReviewRow,
  parseInsightMetadata,
  parseJsonStringArray,
} from "../json-parsers";

// Suppress console.warn from logParseFailure during tests
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

// ── parsePrdInput ───────────────────────────────────────────────────

describe("parsePrdInput", () => {
  it("returns null for null input", () => {
    expect(parsePrdInput(null)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(parsePrdInput("hello")).toBeNull();
  });

  it("parses valid input with all fields", () => {
    expect(
      parsePrdInput({ productName: "Acme", productDescription: "A tool", targetAudience: "PMs" }),
    ).toEqual({ productName: "Acme", productDescription: "A tool", targetAudience: "PMs" });
  });

  it("accepts empty object (all fields optional)", () => {
    expect(parsePrdInput({})).toEqual({});
  });

  it("strips unknown fields", () => {
    const result = parsePrdInput({ productName: "X", extra: 123 });
    expect(result).toEqual({ productName: "X" });
  });
});

// ── parsePrdOutput ──────────────────────────────────────────────────

describe("parsePrdOutput", () => {
  it("returns null for null input", () => {
    expect(parsePrdOutput(null)).toBeNull();
  });

  it("parses valid output", () => {
    expect(parsePrdOutput({ content: "# PRD doc" })).toEqual({ content: "# PRD doc" });
  });

  it("returns null when content is missing", () => {
    expect(parsePrdOutput({})).toBeNull();
  });

  it("returns null for non-string content", () => {
    expect(parsePrdOutput({ content: 42 })).toBeNull();
  });
});

// ── parseAnalysisInput ──────────────────────────────────────────────

describe("parseAnalysisInput", () => {
  it("returns null for null", () => {
    expect(parseAnalysisInput(null)).toBeNull();
  });

  it("parses valid input", () => {
    expect(
      parseAnalysisInput({ productName: "X", industry: "SaaS", competitors: "A, B" }),
    ).toEqual({ productName: "X", industry: "SaaS", competitors: "A, B" });
  });

  it("accepts empty object", () => {
    expect(parseAnalysisInput({})).toEqual({});
  });
});

// ── parseAnalysisOutput ─────────────────────────────────────────────

describe("parseAnalysisOutput", () => {
  it("returns null for null", () => {
    expect(parseAnalysisOutput(null)).toBeNull();
  });

  it("parses valid output", () => {
    expect(parseAnalysisOutput({ content: "analysis text" })).toEqual({ content: "analysis text" });
  });

  it("returns null when content missing", () => {
    expect(parseAnalysisOutput({ other: "field" })).toBeNull();
  });
});

// ── parseDecisionInputTitle ─────────────────────────────────────────

describe("parseDecisionInputTitle", () => {
  it("returns null for null", () => {
    expect(parseDecisionInputTitle(null)).toBeNull();
  });

  it("returns null for array", () => {
    expect(parseDecisionInputTitle([1, 2])).toBeNull();
  });

  it("returns null for string", () => {
    expect(parseDecisionInputTitle("hello")).toBeNull();
  });

  it("returns null when productName is not a string", () => {
    expect(parseDecisionInputTitle({ productName: 42 })).toBeNull();
  });

  it("returns productName when present and string", () => {
    expect(parseDecisionInputTitle({ productName: "Widget" })).toBe("Widget");
  });

  it("returns null when productName is absent", () => {
    expect(parseDecisionInputTitle({ other: "value" })).toBeNull();
  });
});

// ── parseRoadmapRow ─────────────────────────────────────────────────

describe("parseRoadmapRow", () => {
  it("returns safe defaults for empty object", () => {
    const result = parseRoadmapRow({});
    expect(result.id).toBe("");
    expect(result.title).toBe("");
    expect(result.now_items).toEqual([]);
    expect(result.next_items).toEqual([]);
    expect(result.later_items).toEqual([]);
    expect(result.risks).toEqual([]);
    expect(result.is_mock).toBe(false);
  });

  it("parses valid scalar fields", () => {
    const result = parseRoadmapRow({
      id: "abc",
      project_id: "proj-1",
      title: "My Roadmap",
      is_mock: true,
      created_at: "2026-01-01",
    });
    expect(result.id).toBe("abc");
    expect(result.project_id).toBe("proj-1");
    expect(result.title).toBe("My Roadmap");
    expect(result.is_mock).toBe(true);
    expect(result.created_at).toBe("2026-01-01");
  });

  it("parses valid roadmap items in arrays", () => {
    const result = parseRoadmapRow({
      now_items: [
        { title: "Feature A", description: "Build it", priority: "high" },
      ],
    });
    expect(result.now_items).toEqual([
      { title: "Feature A", description: "Build it", priority: "high" },
    ]);
  });

  it("filters out completely invalid items", () => {
    const result = parseRoadmapRow({
      now_items: [
        { title: "Good", description: "Valid" },
        42,
        null,
        "bad",
      ],
    });
    expect(result.now_items).toHaveLength(1);
    expect(result.now_items[0].title).toBe("Good");
  });

  it("recovers items with title but missing description", () => {
    const result = parseRoadmapRow({
      now_items: [{ title: "Partial", extra: true }],
    });
    expect(result.now_items).toHaveLength(1);
    expect(result.now_items[0].title).toBe("Partial");
    expect(result.now_items[0].description).toBe("");
  });

  it("returns empty array when field is not an array", () => {
    const result = parseRoadmapRow({ now_items: "not-an-array" });
    expect(result.now_items).toEqual([]);
  });
});

// ── parseMultiAgentReviewRow ────────────────────────────────────────

describe("parseMultiAgentReviewRow", () => {
  const EMPTY_AGENT = {
    summary: "(response unavailable)",
    key_points: [],
    concerns: [],
    recommendations: [],
    confidence: 0,
  };

  const EMPTY_CONSENSUS = {
    recommendation: "neutral",
    summary: "(consensus unavailable)",
    disagreements: [],
    risks: [],
    next_steps: [],
    overall_confidence: 0,
  };

  it("returns safe defaults for empty object", () => {
    const result = parseMultiAgentReviewRow({});
    expect(result.id).toBe("");
    expect(result.question).toBe("");
    expect(result.input_type).toBe("product_question");
    expect(result.pm_response).toEqual(EMPTY_AGENT);
    expect(result.cto_response).toEqual(EMPTY_AGENT);
    expect(result.ux_response).toEqual(EMPTY_AGENT);
    expect(result.growth_response).toEqual(EMPTY_AGENT);
    expect(result.consensus).toEqual(EMPTY_CONSENSUS);
    expect(result.model).toBeNull();
    expect(result.is_mock).toBe(false);
  });

  it("parses valid agent responses", () => {
    const agent = {
      summary: "Looks good",
      key_points: ["fast", "scalable"],
      concerns: ["cost"],
      recommendations: ["proceed"],
      confidence: 0.8,
    };
    const result = parseMultiAgentReviewRow({
      id: "r1",
      question: "Should we launch?",
      pm_response: agent,
    });
    expect(result.pm_response).toEqual(agent);
    expect(result.cto_response).toEqual(EMPTY_AGENT);
  });

  it("applies defaults for agent with only summary", () => {
    const result = parseMultiAgentReviewRow({
      pm_response: { summary: "Brief" },
    });
    expect(result.pm_response.summary).toBe("Brief");
    expect(result.pm_response.key_points).toEqual([]);
    expect(result.pm_response.confidence).toBe(0.5);
  });

  it("falls back to EMPTY_AGENT for malformed agent data", () => {
    const result = parseMultiAgentReviewRow({
      pm_response: "not-an-object",
    });
    expect(result.pm_response).toEqual(EMPTY_AGENT);
  });

  it("parses valid consensus", () => {
    const result = parseMultiAgentReviewRow({
      consensus: {
        recommendation: "proceed",
        summary: "All agree",
        disagreements: [],
        risks: ["timeline"],
        next_steps: ["plan sprint"],
        overall_confidence: 0.9,
      },
    });
    expect(result.consensus.recommendation).toBe("proceed");
    expect(result.consensus.overall_confidence).toBe(0.9);
  });

  it("preserves model as string or null", () => {
    expect(parseMultiAgentReviewRow({ model: "gpt-4o" }).model).toBe("gpt-4o");
    expect(parseMultiAgentReviewRow({ model: null }).model).toBeNull();
    expect(parseMultiAgentReviewRow({}).model).toBeNull();
  });
});

// ── parseInsightMetadata ────────────────────────────────────────────

describe("parseInsightMetadata", () => {
  it("returns null for null input", () => {
    expect(parseInsightMetadata(null)).toBeNull();
  });

  it("parses valid metadata", () => {
    expect(
      parseInsightMetadata({ priority: "high", confidence: "low", suggested_action: "Do X" }),
    ).toEqual({ priority: "high", confidence: "low", suggested_action: "Do X" });
  });

  it("applies defaults for empty object", () => {
    const result = parseInsightMetadata({});
    expect(result).toMatchObject({ priority: "medium", confidence: "medium" });
  });

  it("returns safe fallback for completely invalid data", () => {
    const result = parseInsightMetadata("not-an-object");
    expect(result).toMatchObject({ priority: "medium", confidence: "medium" });
  });
});

// ── parseJsonStringArray ────────────────────────────────────────────

describe("parseJsonStringArray", () => {
  it("returns empty array for non-array", () => {
    expect(parseJsonStringArray(undefined)).toEqual([]);
    expect(parseJsonStringArray(null)).toEqual([]);
    expect(parseJsonStringArray("hello")).toEqual([]);
    expect(parseJsonStringArray(42)).toEqual([]);
    expect(parseJsonStringArray({})).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    expect(parseJsonStringArray([])).toEqual([]);
  });

  it("preserves valid strings", () => {
    expect(parseJsonStringArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("filters out non-string items", () => {
    expect(parseJsonStringArray(["a", 1, null, "b", true, {}, "c"])).toEqual(["a", "b", "c"]);
  });
});

