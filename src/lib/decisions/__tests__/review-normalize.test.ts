import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  normalizeDecisionReviewOutput,
  formatZodIssuesForLog,
  formatZodIssuesForRetry,
} from "../review-normalize";

// Suppress dev-mode console.log from normalizers
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

// ── normalizeDecisionReviewOutput ───────────────────────────────────

describe("normalizeDecisionReviewOutput", () => {
  it("passes through valid canonical output unchanged", () => {
    const input = {
      summary: "A good decision",
      confidenceScore: 85,
      assumptions: [],
      options: [],
      risks: [],
      recommendation: {
        recommendation: "Go ahead",
        reasoning: ["reason 1"],
        confidenceScore: 90,
        supportingEvidence: [],
        assumptions: [],
        risks: [],
        alternatives: [],
        nextValidationSteps: [],
      },
    };
    const result = normalizeDecisionReviewOutput(input);
    expect(result.summary).toBe("A good decision");
    expect(result.confidenceScore).toBe(85);
    expect(result.recommendation).toMatchObject({
      recommendation: "Go ahead",
      confidenceScore: 90,
    });
  });

  // ── snake_case → camelCase key remapping ──────────────────────────

  it("remaps snake_case keys to camelCase at top level", () => {
    const result = normalizeDecisionReviewOutput({
      confidence_score: 75,
      summary: "test",
    });
    expect(result.confidenceScore).toBe(75);
    expect(result).not.toHaveProperty("confidence_score");
  });

  it("remaps snake_case keys inside nested assumption objects", () => {
    const result = normalizeDecisionReviewOutput({
      assumptions: [
        {
          statement: "Users want this",
          type: "user",
          risk_level: "high",
          evidence_status: "weak",
          validation_method: "survey",
        },
      ],
    });
    const assumption = (result.assumptions as Record<string, unknown>[])[0];
    expect(assumption.riskLevel).toBe("high");
    expect(assumption.evidenceStatus).toBe("weak");
    expect(assumption.validationMethod).toBe("survey");
    expect(assumption).not.toHaveProperty("risk_level");
  });

  it("remaps snake_case keys inside option objects", () => {
    const result = normalizeDecisionReviewOutput({
      options: [
        {
          title: "Option A",
          effort_estimate: "medium",
          confidence_score: "80",
        },
      ],
    });
    const option = (result.options as Record<string, unknown>[])[0];
    expect(option.effortEstimate).toBe("medium");
    expect(option.confidenceScore).toBe(80); // also coerced
  });

  // ── numeric string coercion ───────────────────────────────────────

  it("coerces numeric string confidenceScore to number at top level", () => {
    const result = normalizeDecisionReviewOutput({
      confidence_score: "85",
    });
    expect(result.confidenceScore).toBe(85);
  });

  it("coerces numeric string confidenceScore inside nested items", () => {
    const result = normalizeDecisionReviewOutput({
      options: [{ title: "A", confidence_score: "72.5" }],
    });
    const option = (result.options as Record<string, unknown>[])[0];
    expect(option.confidenceScore).toBe(72.5);
  });

  it("preserves non-numeric string confidenceScore as-is", () => {
    const result = normalizeDecisionReviewOutput({
      confidence_score: "not-a-number",
    });
    expect(result.confidenceScore).toBe("not-a-number");
  });

  it("does not coerce empty string to number", () => {
    const result = normalizeDecisionReviewOutput({
      confidence_score: "",
    });
    expect(result.confidenceScore).toBe("");
  });

  // ── enum alias normalization ──────────────────────────────────────

  it("normalizes assumption type aliases", () => {
    const result = normalizeDecisionReviewOutput({
      assumptions: [
        { statement: "Legal risk", type: "legal" },
        { statement: "Revenue model", type: "financial" },
        { statement: "UX concern", type: "usability" },
        { statement: "Scale concern", type: "scalability" },
      ],
    });
    const types = (result.assumptions as Record<string, unknown>[]).map((a) => a.type);
    expect(types).toEqual(["business", "pricing", "ux", "technical"]);
  });

  it("falls back to 'other' for unknown assumption types", () => {
    const result = normalizeDecisionReviewOutput({
      assumptions: [{ statement: "Alien tech", type: "extraterrestrial" }],
    });
    expect((result.assumptions as Record<string, unknown>[])[0].type).toBe("other");
  });

  it("passes through valid assumption types", () => {
    const result = normalizeDecisionReviewOutput({
      assumptions: [{ statement: "Market fit", type: "market" }],
    });
    expect((result.assumptions as Record<string, unknown>[])[0].type).toBe("market");
  });

  it("normalizes evidence status aliases", () => {
    const result = normalizeDecisionReviewOutput({
      assumptions: [
        { statement: "A", type: "market", evidence_status: "confirmed" },
        { statement: "B", type: "market", evidence_status: "partial" },
        { statement: "C", type: "market", evidence_status: "none" },
      ],
    });
    const statuses = (result.assumptions as Record<string, unknown>[]).map((a) => a.evidenceStatus);
    expect(statuses).toEqual(["strong", "weak", "unsupported"]);
  });

  it("normalizes risk level aliases", () => {
    const result = normalizeDecisionReviewOutput({
      risks: [
        { title: "R1", description: "d", severity: "critical" },
        { title: "R2", description: "d", severity: "minimal" },
      ],
    });
    const severities = (result.risks as Record<string, unknown>[]).map((r) => r.severity);
    expect(severities).toEqual(["high", "low"]);
  });

  it("normalizes effort estimate aliases", () => {
    const result = normalizeDecisionReviewOutput({
      options: [
        { title: "A", effort_estimate: "trivial" },
        { title: "B", effort_estimate: "complex" },
        { title: "C", effort_estimate: "tbd" },
      ],
    });
    const efforts = (result.options as Record<string, unknown>[]).map((o) => o.effortEstimate);
    expect(efforts).toEqual(["low", "high", "unknown"]);
  });

  // ── recommendation optional arrays default to [] ──────────────────

  it("defaults null optional arrays in recommendation to []", () => {
    const result = normalizeDecisionReviewOutput({
      recommendation: {
        recommendation: "Go",
        reasoning: ["reason"],
        supportingEvidence: null,
        assumptions: null,
        risks: null,
        alternatives: null,
        nextValidationSteps: null,
      },
    });
    const rec = result.recommendation as Record<string, unknown>;
    expect(rec.supportingEvidence).toEqual([]);
    expect(rec.assumptions).toEqual([]);
    expect(rec.risks).toEqual([]);
    expect(rec.alternatives).toEqual([]);
    expect(rec.nextValidationSteps).toEqual([]);
  });

  it("defaults undefined optional arrays in recommendation to []", () => {
    const result = normalizeDecisionReviewOutput({
      recommendation: {
        recommendation: "Go",
        reasoning: ["reason"],
      },
    });
    const rec = result.recommendation as Record<string, unknown>;
    expect(rec.supportingEvidence).toEqual([]);
    expect(rec.nextValidationSteps).toEqual([]);
  });

  // ── edge cases ────────────────────────────────────────────────────

  it("handles empty input without crashing", () => {
    const result = normalizeDecisionReviewOutput({});
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("does not normalize assumption type when statement is absent", () => {
    // normalizeAssumptionType only fires when both "type" and "statement" exist
    const result = normalizeDecisionReviewOutput({
      assumptions: [{ type: "legal" }],
    });
    // Without statement, type should NOT be remapped
    expect((result.assumptions as Record<string, unknown>[])[0].type).toBe("legal");
  });

  // ── AI garbage output resilience ──────────────────────────────────

  it("handles assumptions as non-array (string) without crashing", () => {
    const result = normalizeDecisionReviewOutput({
      assumptions: "not an array",
    });
    // Non-array is not processed, just passed through
    expect(result.assumptions).toBe("not an array");
  });

  it("handles options containing null items", () => {
    const result = normalizeDecisionReviewOutput({
      options: [null, { title: "Valid", effort_estimate: "low" }, undefined],
    });
    const options = result.options as unknown[];
    // normalizeItem returns null/undefined as-is; Zod will reject them downstream
    expect(options).toHaveLength(3);
    expect(options[0]).toBeNull();
    expect((options[1] as Record<string, unknown>).effortEstimate).toBe("low");
  });

  it("handles recommendation as array without crashing", () => {
    const result = normalizeDecisionReviewOutput({
      recommendation: ["not", "an", "object"],
    });
    // Array recommendation skips both normalize and null-defaults branches
    expect(Array.isArray(result.recommendation)).toBe(true);
  });

  it("handles recommendation as string without crashing", () => {
    const result = normalizeDecisionReviewOutput({
      recommendation: "just a string",
    });
    expect(result.recommendation).toBe("just a string");
  });

  it("handles non-string enum values with safe defaults", () => {
    const result = normalizeDecisionReviewOutput({
      assumptions: [
        { statement: "A", type: 42 },
      ],
      risks: [
        { title: "R", description: "d", severity: null },
      ],
      options: [
        { title: "O", effort_estimate: true },
      ],
    });
    expect((result.assumptions as Record<string, unknown>[])[0].type).toBe("other");
    expect((result.risks as Record<string, unknown>[])[0].severity).toBe("medium");
    expect((result.options as Record<string, unknown>[])[0].effortEstimate).toBe("unknown");
  });

  // ── idempotency ───────────────────────────────────────────────────

  it("is idempotent — normalizing twice produces identical output", () => {
    const input = {
      confidence_score: "85",
      assumptions: [
        { statement: "Legal risk", type: "legal", risk_level: "high", evidence_status: "partial" },
      ],
      options: [
        { title: "A", effort_estimate: "complex", confidence_score: "90" },
      ],
      risks: [
        { title: "R", description: "d", severity: "critical" },
      ],
      recommendation: {
        recommendation: "Go",
        reasoning: ["r"],
        supporting_evidence: null,
        next_validation_steps: null,
      },
    };
    const first = normalizeDecisionReviewOutput(input);
    const second = normalizeDecisionReviewOutput(first);
    expect(second).toEqual(first);
  });
});

// ── formatZodIssuesForLog ───────────────────────────────────────────

describe("formatZodIssuesForLog", () => {
  it("formats basic issues with path and message", () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 42 });
    if (result.success) throw new Error("Expected failure");
    const lines = formatZodIssuesForLog(result.error);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toContain("name");
  });

  it("truncates to at most 15 issues", () => {
    const schema = z.object(
      Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`f${i}`, z.string()])),
    );
    const result = schema.safeParse({});
    if (result.success) throw new Error("Expected failure");
    const lines = formatZodIssuesForLog(result.error);
    expect(lines.length).toBeLessThanOrEqual(15);
  });
});

// ── formatZodIssuesForRetry ─────────────────────────────────────────

describe("formatZodIssuesForRetry", () => {
  it("returns semicolon-separated string", () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    const result = schema.safeParse({});
    if (result.success) throw new Error("Expected failure");
    const output = formatZodIssuesForRetry(result.error);
    expect(typeof output).toBe("string");
    expect(output.length).toBeGreaterThan(0);
  });

  it("truncates to at most 10 issues", () => {
    const schema = z.object(
      Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`f${i}`, z.string()])),
    );
    const result = schema.safeParse({});
    if (result.success) throw new Error("Expected failure");
    const output = formatZodIssuesForRetry(result.error);
    // Count semicolons — max 9 separators for 10 items
    const parts = output.split("; ");
    expect(parts.length).toBeLessThanOrEqual(10);
  });
});

