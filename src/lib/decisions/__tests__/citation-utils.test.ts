import { describe, it, expect } from "vitest";
import { sanitizeCitationIds } from "../citation-utils";
import type { DecisionReviewOutput } from "../review-schemas";

type Assumption = DecisionReviewOutput["assumptions"][number];
type Option = DecisionReviewOutput["options"][number];
type Risk = DecisionReviewOutput["risks"][number];

function makeAssumption(overrides: Partial<Assumption> = {}): Assumption {
  return {
    statement: "Assumption 1",
    type: "user",
    riskLevel: "medium",
    evidenceStatus: "weak",
    validationMethod: "User interviews",
    supportingCitationIds: ["[1]", "[2]"],
    ...overrides,
  };
}

function makeOption(overrides: Partial<Option> = {}): Option {
  return {
    title: "Option 1",
    description: "First option",
    pros: ["Pro 1"],
    cons: ["Con 1"],
    risks: ["Risk 1"],
    expectedImpact: "Improves decision quality",
    effortEstimate: "medium",
    reversibility: "medium",
    confidenceScore: 70,
    supportingCitationIds: ["[1]"],
    ...overrides,
  };
}

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    title: "Risk 1",
    description: "First risk",
    severity: "high",
    mitigation: "Mitigation plan",
    supportingCitationIds: ["[2]", "[3]"],
    ...overrides,
  };
}

function makeReviewOutput(
  overrides: Partial<DecisionReviewOutput> = {}
): DecisionReviewOutput {
  return {
    summary: "Test decision analysis summary",
    confidenceScore: 75,
    assumptions: [makeAssumption()],
    options: [makeOption()],
    risks: [makeRisk()],
    recommendation: {
      recommendation: "Recommend option 1",
      reasoning: ["Reason 1"],
      supportingEvidence: ["Evidence 1"],
      assumptions: ["Assumption 1"],
      risks: ["Risk 1"],
      alternatives: ["Alternative 1"],
      nextValidationSteps: ["Step 1"],
      confidenceScore: 75,
    },
    ...overrides,
  };
}

describe("sanitizeCitationIds", () => {
  it("keeps all citation IDs when all are valid", () => {
    const validIds = new Set(["[1]", "[2]", "[3]"]);
    const input = makeReviewOutput();

    const result = sanitizeCitationIds(input, validIds);

    expect(result.assumptions[0].supportingCitationIds).toEqual(["[1]", "[2]"]);
    expect(result.options[0].supportingCitationIds).toEqual(["[1]"]);
    expect(result.risks[0].supportingCitationIds).toEqual(["[2]", "[3]"]);
  });

  it("removes invalid citation IDs while preserving valid ones", () => {
    const validIds = new Set(["[1]", "[3]"]); // [2] is invalid
    const input = makeReviewOutput();

    const result = sanitizeCitationIds(input, validIds);

    expect(result.assumptions[0].supportingCitationIds).toEqual(["[1]"]); // [2] removed
    expect(result.options[0].supportingCitationIds).toEqual(["[1]"]);
    expect(result.risks[0].supportingCitationIds).toEqual(["[3]"]); // [2] removed
  });

  it("preserves order of valid citation IDs", () => {
    const validIds = new Set(["[1]", "[2]", "[5]"]);
    const input = makeReviewOutput({
      assumptions: [makeAssumption({
        statement: "Test",
        type: "market",
        riskLevel: "low",
        evidenceStatus: "strong",
        supportingCitationIds: ["[5]", "[99]", "[2]", "[1]"],
      })],
    });

    const result = sanitizeCitationIds(input, validIds);

    expect(result.assumptions[0].supportingCitationIds).toEqual(["[5]", "[2]", "[1]"]);
  });

  it("returns empty array when all citation IDs are invalid", () => {
    const validIds = new Set(["[99]"]); // None of the existing IDs are valid
    const input = makeReviewOutput();

    const result = sanitizeCitationIds(input, validIds);

    expect(result.assumptions[0].supportingCitationIds).toEqual([]);
    expect(result.options[0].supportingCitationIds).toEqual([]);
    expect(result.risks[0].supportingCitationIds).toEqual([]);
  });

  it("preserves undefined supportingCitationIds", () => {
    const validIds = new Set(["[1]"]);
    const input = makeReviewOutput({
      assumptions: [makeAssumption({
        statement: "Test",
        type: "technical",
        riskLevel: "high",
        evidenceStatus: "unsupported",
        supportingCitationIds: undefined,
      })],
      options: [makeOption({
        title: "Option",
        description: "Desc",
        pros: ["Pro"],
        cons: ["Con"],
        risks: ["Risk"],
        effortEstimate: "low",
        reversibility: "high",
        confidenceScore: 50,
        supportingCitationIds: undefined,
      })],
      risks: [makeRisk({
        title: "Risk",
        description: "Desc",
        severity: "medium",
        supportingCitationIds: undefined,
      })],
    });

    const result = sanitizeCitationIds(input, validIds);

    expect(result.assumptions[0].supportingCitationIds).toBeUndefined();
    expect(result.options[0].supportingCitationIds).toBeUndefined();
    expect(result.risks[0].supportingCitationIds).toBeUndefined();
  });

  it("filters citations independently across multiple items", () => {
    const validIds = new Set(["[1]", "[4]"]);
    const input = makeReviewOutput({
      assumptions: [
        makeAssumption({
          statement: "Assumption 1",
          type: "user",
          riskLevel: "low",
          evidenceStatus: "strong",
          supportingCitationIds: ["[1]", "[2]"], // [2] invalid
        }),
        makeAssumption({
          statement: "Assumption 2",
          type: "market",
          riskLevel: "high",
          evidenceStatus: "weak",
          supportingCitationIds: ["[3]", "[4]"], // [3] invalid
        }),
      ],
      options: [
        makeOption({
          title: "Option 1",
          description: "Desc 1",
          pros: ["Pro"],
          cons: ["Con"],
          risks: ["Risk"],
          effortEstimate: "low",
          reversibility: "high",
          confidenceScore: 80,
          supportingCitationIds: ["[1]"],
        }),
        makeOption({
          title: "Option 2",
          description: "Desc 2",
          pros: ["Pro"],
          cons: ["Con"],
          risks: ["Risk"],
          effortEstimate: "high",
          reversibility: "low",
          confidenceScore: 60,
          supportingCitationIds: ["[5]", "[6]"], // All invalid
        }),
      ],
      risks: [
        makeRisk({
          title: "Risk 1",
          description: "Desc 1",
          severity: "high",
          supportingCitationIds: ["[4]"],
        }),
        makeRisk({
          title: "Risk 2",
          description: "Desc 2",
          severity: "medium",
          supportingCitationIds: ["[7]"], // Invalid
        }),
      ],
    });

    const result = sanitizeCitationIds(input, validIds);

    expect(result.assumptions[0].supportingCitationIds).toEqual(["[1]"]);
    expect(result.assumptions[1].supportingCitationIds).toEqual(["[4]"]);
    expect(result.options[0].supportingCitationIds).toEqual(["[1]"]);
    expect(result.options[1].supportingCitationIds).toEqual([]);
    expect(result.risks[0].supportingCitationIds).toEqual(["[4]"]);
    expect(result.risks[1].supportingCitationIds).toEqual([]);
  });

  it("returns a new output structure", () => {
    const validIds = new Set(["[1]"]);
    const input = makeReviewOutput();

    const result = sanitizeCitationIds(input, validIds);

    expect(result).not.toBe(input);
    expect(result.assumptions).not.toBe(input.assumptions);
    expect(result.options).not.toBe(input.options);
    expect(result.risks).not.toBe(input.risks);
    expect(result.assumptions[0]).not.toBe(input.assumptions[0]);
    expect(result.options[0]).not.toBe(input.options[0]);
    expect(result.risks[0]).not.toBe(input.risks[0]);
  });

  it("does not mutate original citation arrays", () => {
    const validIds = new Set(["[1]"]);
    const input = makeReviewOutput();
    const originalAssumptionIds = [...(input.assumptions[0].supportingCitationIds ?? [])];
    const originalOptionIds = [...(input.options[0].supportingCitationIds ?? [])];
    const originalRiskIds = [...(input.risks[0].supportingCitationIds ?? [])];

    sanitizeCitationIds(input, validIds);

    expect(input.assumptions[0].supportingCitationIds).toEqual(originalAssumptionIds);
    expect(input.options[0].supportingCitationIds).toEqual(originalOptionIds);
    expect(input.risks[0].supportingCitationIds).toEqual(originalRiskIds);
  });

  it("does not mutate the validIds set", () => {
    const validIds = new Set(["[1]"]);
    const input = makeReviewOutput();
    const originalValidIds = Array.from(validIds);

    sanitizeCitationIds(input, validIds);

    expect(Array.from(validIds)).toEqual(originalValidIds);
  });

  it("preserves unrelated decision review fields", () => {
    const validIds = new Set(["[1]"]);
    const input = makeReviewOutput();

    const result = sanitizeCitationIds(input, validIds);

    expect(result).toMatchObject({
      summary: input.summary,
      confidenceScore: input.confidenceScore,
      recommendation: input.recommendation,
    });

    expect(result.assumptions[0]).toMatchObject({
      statement: input.assumptions[0].statement,
      type: input.assumptions[0].type,
      riskLevel: input.assumptions[0].riskLevel,
      evidenceStatus: input.assumptions[0].evidenceStatus,
      validationMethod: input.assumptions[0].validationMethod,
    });

    expect(result.options[0]).toMatchObject({
      title: input.options[0].title,
      description: input.options[0].description,
      expectedImpact: input.options[0].expectedImpact,
      effortEstimate: input.options[0].effortEstimate,
      reversibility: input.options[0].reversibility,
      confidenceScore: input.options[0].confidenceScore,
    });

    expect(result.risks[0]).toMatchObject({
      title: input.risks[0].title,
      description: input.risks[0].description,
      severity: input.risks[0].severity,
      mitigation: input.risks[0].mitigation,
    });

    expect(result.options[0].pros).toEqual(input.options[0].pros);
    expect(result.options[0].cons).toEqual(input.options[0].cons);
    expect(result.options[0].risks).toEqual(input.options[0].risks);
  });

  it("preserves undefined, empty, and invalid-only citation behaviors", () => {
    const validIds = new Set(["[1]"]);
    const input = makeReviewOutput({
      assumptions: [makeAssumption({ supportingCitationIds: undefined })],
      options: [makeOption({ supportingCitationIds: [] })],
      risks: [makeRisk({ supportingCitationIds: ["[404]"] })],
    });

    const result = sanitizeCitationIds(input, validIds);

    expect(result.assumptions[0].supportingCitationIds).toBeUndefined();
    expect(result.options[0].supportingCitationIds).toEqual([]);
    expect(result.risks[0].supportingCitationIds).toEqual([]);
  });

  it("preserves duplicate valid citation IDs and order while removing invalid duplicates", () => {
    const validIds = new Set(["[1]", "[2]"]);
    const input = makeReviewOutput({
      assumptions: [makeAssumption({
        statement: "Test",
        type: "growth",
        riskLevel: "medium",
        evidenceStatus: "moderate",
        supportingCitationIds: ["[1]", "[99]", "[1]", "[99]", "[2]"],
      })],
    });

    const result = sanitizeCitationIds(input, validIds);

    expect(result.assumptions[0].supportingCitationIds).toEqual(["[1]", "[1]", "[2]"]);
  });
});
