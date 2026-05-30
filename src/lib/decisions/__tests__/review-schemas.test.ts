import { describe, it, expect } from "vitest";
import { decisionReviewOutputSchema, type DecisionReviewOutput } from "../review-schemas";

// ── Fixture factory ─────────────────────────────────────────────────

function makeValidReview(overrides?: Partial<DecisionReviewOutput>): DecisionReviewOutput {
  return {
    summary: "This is a meaningful summary for the decision review output.",
    confidenceScore: 75,
    assumptions: [
      {
        statement: "Users will adopt the feature within 3 months",
        type: "user",
        riskLevel: "medium",
        evidenceStatus: "moderate",
      },
    ],
    options: [
      makeOption("Option A"),
      makeOption("Option B"),
      makeOption("Option C"),
    ],
    risks: [
      {
        title: "Market risk",
        description: "The market may not be ready for this product.",
        severity: "high",
      },
    ],
    recommendation: {
      recommendation: "We recommend proceeding with Option A based on evidence.",
      reasoning: ["Strong market fit"],
      supportingEvidence: [],
      assumptions: [],
      risks: [],
      alternatives: [],
      nextValidationSteps: [],
      confidenceScore: 80,
    },
    ...overrides,
  };
}

function makeOption(title: string) {
  return {
    title,
    description: "A viable option worth considering.",
    pros: ["Good ROI"],
    cons: ["Some risk"],
    risks: [],
    effortEstimate: "medium" as const,
    reversibility: "high" as const,
    confidenceScore: 70,
  };
}

/**
 * Build an untyped review for tests that need to inject invalid values.
 * Avoids `as any` by constructing a plain object not bound to DecisionReviewOutput.
 */
function makeUntypedReview(overrides?: Record<string, unknown>): Record<string, unknown> {
  return { ...makeValidReview(), ...overrides };
}

// ── Valid inputs ─────────────────────────────────────────────────────

describe("decisionReviewOutputSchema — valid inputs", () => {
  it("accepts a complete valid fixture", () => {
    const result = decisionReviewOutputSchema.safeParse(makeValidReview());
    expect(result.success).toBe(true);
  });

  it("accepts minimal valid fixture (only required fields, no optionals)", () => {
    // Explicitly omit all optional fields to confirm the minimal shape passes
    const review = makeValidReview({
      assumptions: [{
        statement: "Users will adopt the feature within 3 months",
        type: "user",
        riskLevel: "medium",
        evidenceStatus: "moderate",
        // validationMethod: omitted
        // supportingCitationIds: omitted
      }],
      options: [{
        title: "Option AA",
        description: "Description here.",
        pros: ["Pro"],
        cons: ["Con"],
        risks: [],
        effortEstimate: "medium",
        reversibility: "high",
        confidenceScore: 60,
        // expectedImpact: omitted
        // supportingCitationIds: omitted
      }, makeOption("Option BB"), makeOption("Option CC")],
      risks: [{
        title: "Risk AA",
        description: "Some risk description.",
        severity: "low",
        // mitigation: omitted
        // supportingCitationIds: omitted
      }],
    });
    expect(decisionReviewOutputSchema.safeParse(review).success).toBe(true);
  });

  it("accepts optional fields when present", () => {
    const review = makeValidReview({
      assumptions: [
        {
          statement: "Users want this feature urgently",
          type: "market",
          riskLevel: "low",
          evidenceStatus: "strong",
          validationMethod: "Survey of 500 users",
          supportingCitationIds: ["cite-1", "cite-2"],
        },
      ],
    });
    const result = decisionReviewOutputSchema.safeParse(review);
    expect(result.success).toBe(true);
  });

  it("accepts 4 options (max boundary)", () => {
    const review = makeValidReview({
      options: [
        makeOption("Op AA"),
        makeOption("Op BB"),
        makeOption("Op CC"),
        makeOption("Op DD"),
      ],
    });
    const result = decisionReviewOutputSchema.safeParse(review);
    expect(result.success).toBe(true);
  });

  it("accepts all assumption type enum values", () => {
    const types = ["market", "user", "technical", "growth", "pricing", "ux", "business", "other"] as const;
    for (const type of types) {
      const review = makeValidReview({
        assumptions: [{
          statement: "Some assumption statement here",
          type,
          riskLevel: "low",
          evidenceStatus: "weak",
        }],
      });
      expect(decisionReviewOutputSchema.safeParse(review).success).toBe(true);
    }
  });

  it("accepts all effort/reversibility enum values", () => {
    for (const val of ["low", "medium", "high", "unknown"] as const) {
      const review = makeValidReview({
        options: [
          { ...makeOption("Op AA"), effortEstimate: val, reversibility: val },
          makeOption("Op BB"),
          makeOption("Op CC"),
        ],
      });
      expect(decisionReviewOutputSchema.safeParse(review).success).toBe(true);
    }
  });

  it("accepts confidenceScore at boundaries (0 and 100)", () => {
    expect(decisionReviewOutputSchema.safeParse(makeValidReview({ confidenceScore: 0 })).success).toBe(true);
    expect(decisionReviewOutputSchema.safeParse(makeValidReview({ confidenceScore: 100 })).success).toBe(true);
  });

  it("accepts empty option description (schema has no min-length)", () => {
    // option.description has max(5000) but no min(). Empty string is accepted.
    // UI guards with `{opt.description && ...}` so empty string just hides the paragraph.
    // Harmless — no schema change needed.
    const review = makeValidReview({
      options: [
        { ...makeOption("Op AA"), description: "" },
        makeOption("Op BB"),
        makeOption("Op CC"),
      ],
    });
    expect(decisionReviewOutputSchema.safeParse(review).success).toBe(true);
  });
});

// ── Missing required fields ─────────────────────────────────────────

describe("decisionReviewOutputSchema — missing required fields", () => {
  it("rejects missing summary", () => {
    const { summary: _, ...rest } = makeValidReview();
    expect(decisionReviewOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing confidenceScore", () => {
    const { confidenceScore: _, ...rest } = makeValidReview();
    expect(decisionReviewOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing assumptions", () => {
    const { assumptions: _, ...rest } = makeValidReview();
    expect(decisionReviewOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing options", () => {
    const { options: _, ...rest } = makeValidReview();
    expect(decisionReviewOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing risks", () => {
    const { risks: _, ...rest } = makeValidReview();
    expect(decisionReviewOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing recommendation", () => {
    const { recommendation: _, ...rest } = makeValidReview();
    expect(decisionReviewOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing recommendation.reasoning", () => {
    const review = makeValidReview();
    const { reasoning: _, ...recRest } = review.recommendation;
    const input = { ...review, recommendation: recRest };
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });
});

// ── Invalid enum values ─────────────────────────────────────────────

describe("decisionReviewOutputSchema — invalid enums", () => {
  it("rejects invalid assumption type", () => {
    const input = makeUntypedReview({
      assumptions: [{
        statement: "Some assumption about the product",
        type: "legal", // not in enum — normalizer would fix this, schema must reject
        riskLevel: "low",
        evidenceStatus: "weak",
      }],
    });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects invalid riskLevel", () => {
    const input = makeUntypedReview({
      assumptions: [{
        statement: "Some assumption about the product",
        type: "market",
        riskLevel: "critical",
        evidenceStatus: "weak",
      }],
    });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects invalid evidenceStatus", () => {
    const input = makeUntypedReview({
      assumptions: [{
        statement: "Some assumption about the product",
        type: "market",
        riskLevel: "low",
        evidenceStatus: "proven",
      }],
    });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects invalid effortEstimate", () => {
    const input = makeUntypedReview({
      options: [
        { ...makeOption("Option AA"), effortEstimate: "huge" },
        makeOption("Option BB"),
        makeOption("Option CC"),
      ],
    });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects invalid reversibility", () => {
    const input = makeUntypedReview({
      options: [
        { ...makeOption("Option AA"), reversibility: "irreversible" },
        makeOption("Option BB"),
        makeOption("Option CC"),
      ],
    });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects invalid risk severity", () => {
    const input = makeUntypedReview({
      risks: [{
        title: "Some risk",
        description: "Risk description goes here.",
        severity: "catastrophic",
      }],
    });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });
});

// ── Confidence score validation ─────────────────────────────────────

describe("decisionReviewOutputSchema — confidence score", () => {
  it("rejects confidenceScore below 0", () => {
    expect(decisionReviewOutputSchema.safeParse(makeValidReview({ confidenceScore: -1 })).success).toBe(false);
  });

  it("rejects confidenceScore above 100", () => {
    expect(decisionReviewOutputSchema.safeParse(makeValidReview({ confidenceScore: 101 })).success).toBe(false);
  });

  it("rejects confidenceScore as string (schema does not coerce)", () => {
    const input = makeUntypedReview({ confidenceScore: "75" });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects confidenceScore as NaN", () => {
    const input = makeUntypedReview({ confidenceScore: NaN });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects confidenceScore as Infinity", () => {
    const input = makeUntypedReview({ confidenceScore: Infinity });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects option confidenceScore out of range", () => {
    const review = makeValidReview({
      options: [
        { ...makeOption("Option AA"), confidenceScore: 150 },
        makeOption("Option BB"),
        makeOption("Option CC"),
      ],
    });
    expect(decisionReviewOutputSchema.safeParse(review).success).toBe(false);
  });

  it("rejects recommendation confidenceScore out of range", () => {
    const review = makeValidReview();
    review.recommendation.confidenceScore = -5;
    expect(decisionReviewOutputSchema.safeParse(review).success).toBe(false);
  });
});

// ── Array constraints ───────────────────────────────────────────────

describe("decisionReviewOutputSchema — array constraints", () => {
  it("rejects empty assumptions array", () => {
    expect(decisionReviewOutputSchema.safeParse(makeValidReview({ assumptions: [] })).success).toBe(false);
  });

  it("rejects fewer than 3 options", () => {
    expect(decisionReviewOutputSchema.safeParse(
      makeValidReview({ options: [makeOption("Op AA"), makeOption("Op BB")] }),
    ).success).toBe(false);
  });

  it("rejects more than 4 options", () => {
    expect(decisionReviewOutputSchema.safeParse(
      makeValidReview({
        options: [makeOption("Op AA"), makeOption("Op BB"), makeOption("Op CC"), makeOption("Op DD"), makeOption("Op EE")],
      }),
    ).success).toBe(false);
  });

  it("rejects empty risks array", () => {
    expect(decisionReviewOutputSchema.safeParse(makeValidReview({ risks: [] })).success).toBe(false);
  });

  it("rejects option with empty pros", () => {
    const review = makeValidReview({
      options: [
        { ...makeOption("Option AA"), pros: [] },
        makeOption("Option BB"),
        makeOption("Option CC"),
      ],
    });
    expect(decisionReviewOutputSchema.safeParse(review).success).toBe(false);
  });

  it("rejects option with empty cons", () => {
    const review = makeValidReview({
      options: [
        { ...makeOption("Option AA"), cons: [] },
        makeOption("Option BB"),
        makeOption("Option CC"),
      ],
    });
    expect(decisionReviewOutputSchema.safeParse(review).success).toBe(false);
  });

  it("rejects empty recommendation.reasoning", () => {
    const review = makeValidReview();
    review.recommendation.reasoning = [];
    expect(decisionReviewOutputSchema.safeParse(review).success).toBe(false);
  });
});

// ── String length constraints ───────────────────────────────────────

describe("decisionReviewOutputSchema — string constraints", () => {
  it("rejects summary shorter than 10 chars", () => {
    expect(decisionReviewOutputSchema.safeParse(makeValidReview({ summary: "Short" })).success).toBe(false);
  });

  it("rejects assumption statement shorter than 5 chars", () => {
    const review = makeValidReview({
      assumptions: [{
        statement: "Hi",
        type: "market",
        riskLevel: "low",
        evidenceStatus: "weak",
      }],
    });
    expect(decisionReviewOutputSchema.safeParse(review).success).toBe(false);
  });

  it("rejects option title shorter than 2 chars", () => {
    const review = makeValidReview({
      options: [
        { ...makeOption("Option AA"), title: "X" },
        makeOption("Option BB"),
        makeOption("Option CC"),
      ],
    });
    expect(decisionReviewOutputSchema.safeParse(review).success).toBe(false);
  });

  it("rejects recommendation text shorter than 10 chars", () => {
    const review = makeValidReview();
    review.recommendation.recommendation = "Do it";
    expect(decisionReviewOutputSchema.safeParse(review).success).toBe(false);
  });
});

// ── Malformed nested structures ─────────────────────────────────────

describe("decisionReviewOutputSchema — malformed structures", () => {
  it("rejects null top-level input", () => {
    expect(decisionReviewOutputSchema.safeParse(null).success).toBe(false);
  });

  it("rejects primitive top-level input", () => {
    expect(decisionReviewOutputSchema.safeParse("not an object").success).toBe(false);
  });

  it("rejects array top-level input", () => {
    expect(decisionReviewOutputSchema.safeParse([makeValidReview()]).success).toBe(false);
  });

  it("rejects null in assumptions array", () => {
    const input = makeUntypedReview({ assumptions: [null] });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects primitive in options array", () => {
    const input = makeUntypedReview({ options: ["option1", "option2", "option3"] });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects recommendation as string", () => {
    const input = makeUntypedReview({ recommendation: "Just do option A" });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects recommendation as null", () => {
    const input = makeUntypedReview({ recommendation: null });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects assumptions as string", () => {
    const input = makeUntypedReview({ assumptions: "some assumptions" });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects number in risks array items", () => {
    const input = makeUntypedReview({ risks: [42] });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects partially malformed object in options array", () => {
    const input = makeUntypedReview({
      options: [
        { title: "Only Title" }, // missing required fields
        makeOption("Option BB"),
        makeOption("Option CC"),
      ],
    });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects option with missing title", () => {
    const { title: _, ...noTitle } = makeOption("Option AA");
    const input = makeUntypedReview({
      options: [noTitle, makeOption("Option BB"), makeOption("Option CC")],
    });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });
});

// ── Unknown fields behavior ─────────────────────────────────────────

describe("decisionReviewOutputSchema — unknown fields", () => {
  it("strips unknown top-level fields (default Zod behavior)", () => {
    const input = { ...makeValidReview(), extraField: "should be stripped" };
    const result = decisionReviewOutputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect("extraField" in result.data).toBe(false);
    }
  });

  it("strips unknown fields in nested objects", () => {
    const review = makeValidReview();
    const assumption = review.assumptions[0] as Record<string, unknown>;
    assumption.bonus = "extra";
    const result = decisionReviewOutputSchema.safeParse(review);
    expect(result.success).toBe(true);
    if (result.success) {
      expect("bonus" in result.data.assumptions[0]).toBe(false);
    }
  });
});

// ── Normalizer → Schema boundary ────────────────────────────────────

describe("normalizer → schema boundary", () => {
  it("schema rejects snake_case keys (normalizer responsibility)", () => {
    const raw = {
      summary: "A decision that was made with careful consideration.",
      confidence_score: 75, // snake_case — schema expects camelCase
      assumptions: [
        {
          statement: "Users will adopt within 3 months",
          type: "user",
          risk_level: "medium",
          evidence_status: "moderate",
        },
      ],
      options: [makeOption("Option AA"), makeOption("Option BB"), makeOption("Option CC")],
      risks: [{ title: "Risk AA", description: "Description here", severity: "high" }],
      recommendation: {
        recommendation: "We recommend proceeding with the chosen option.",
        reasoning: ["Good fit"],
        supportingEvidence: [],
        assumptions: [],
        risks: [],
        alternatives: [],
        nextValidationSteps: [],
        confidenceScore: 80,
      },
    };
    expect(decisionReviewOutputSchema.safeParse(raw).success).toBe(false);
  });

  it("schema rejects numeric string confidenceScore (normalizer coerces)", () => {
    const input = makeUntypedReview({ confidenceScore: "85" });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });

  it("schema rejects non-canonical enum alias (normalizer maps)", () => {
    const input = makeUntypedReview({
      assumptions: [{
        statement: "Legal compliance is required for launch",
        type: "legal", // normalizer maps to "business"
        riskLevel: "low",
        evidenceStatus: "weak",
      }],
    });
    expect(decisionReviewOutputSchema.safeParse(input).success).toBe(false);
  });
});

