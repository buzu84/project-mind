import { describe, it, expect } from "vitest";
import {
  decisionSchema,
  DECISION_TITLE_MIN,
  DECISION_TITLE_MAX,
  DECISION_PROBLEM_MIN,
  DECISION_PROBLEM_MAX,
  DECISION_CONTEXT_MAX,
} from "../decision";
import { projectSchema, PROJECT_NAME_MIN, PROJECT_NAME_MAX, PROJECT_DESC_MAX } from "../project";
import {
  featureSchema,
  FEATURE_NAME_MIN,
  FEATURE_NAME_MAX,
  FEATURE_DESC_MIN,
  FEATURE_DESC_MAX,
} from "../feature";
import {
  feedbackSchema,
  VALID_SOURCES,
  FEEDBACK_TITLE_MIN,
  FEEDBACK_TITLE_MAX,
  FEEDBACK_CONTENT_MIN,
  FEEDBACK_CONTENT_MAX,
} from "../feedback";

// ═══════════════════════════════════════════════════════════════════
// decisionSchema
// ═══════════════════════════════════════════════════════════════════

describe("decisionSchema", () => {
  const valid = {
    title: "Launch mobile app",
    problem_statement: "Users need mobile access to the platform",
  };

  it("accepts valid minimal input (defaults applied)", () => {
    const r = decisionSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.category).toBe("other");
      expect(r.data.status).toBe("draft");
      expect(r.data.context_summary).toBeNull();
    }
  });

  it("accepts valid full input", () => {
    const r = decisionSchema.safeParse({
      ...valid,
      category: "product",
      status: "under_review",
      context_summary: "We have 60% mobile users",
      confidence_score: 85,
      selected_option_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    });
    expect(r.success).toBe(true);
  });

  it("trims title whitespace", () => {
    const r = decisionSchema.safeParse({ ...valid, title: "  padded  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBe("padded");
  });

  it("rejects empty title", () => {
    expect(decisionSchema.safeParse({ ...valid, title: "" }).success).toBe(false);
  });

  it("rejects whitespace-only title", () => {
    expect(decisionSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
  });

  it("rejects title below min length", () => {
    expect(decisionSchema.safeParse({ ...valid, title: "ab" }).success).toBe(false);
  });

  it("rejects problem_statement below min length", () => {
    expect(decisionSchema.safeParse({ ...valid, problem_statement: "short" }).success).toBe(false);
  });

  it("rejects invalid category", () => {
    expect(decisionSchema.safeParse({ ...valid, category: "invalid" }).success).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(decisionSchema.safeParse({ ...valid, status: "closed" }).success).toBe(false);
  });

  it("transforms empty context_summary to null", () => {
    const r = decisionSchema.safeParse({ ...valid, context_summary: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.context_summary).toBeNull();
  });

  it("transforms whitespace-only context_summary to null", () => {
    const r = decisionSchema.safeParse({ ...valid, context_summary: "   " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.context_summary).toBeNull();
  });

  it("rejects confidence_score out of range", () => {
    expect(decisionSchema.safeParse({ ...valid, confidence_score: 101 }).success).toBe(false);
    expect(decisionSchema.safeParse({ ...valid, confidence_score: -1 }).success).toBe(false);
  });

  it("accepts all valid categories", () => {
    for (const cat of [
      "product",
      "technical",
      "growth",
      "ux",
      "business",
      "strategy",
      "other",
    ] as const) {
      expect(decisionSchema.safeParse({ ...valid, category: cat }).success).toBe(true);
    }
  });

  it("accepts all valid statuses", () => {
    for (const s of ["draft", "under_review", "accepted", "rejected", "revisit"] as const) {
      expect(decisionSchema.safeParse({ ...valid, status: s }).success).toBe(true);
    }
  });

  it("accepts title at exact min length", () => {
    expect(
      decisionSchema.safeParse({ ...valid, title: "x".repeat(DECISION_TITLE_MIN) }).success,
    ).toBe(true);
  });

  it("accepts title at exact max length", () => {
    expect(
      decisionSchema.safeParse({ ...valid, title: "x".repeat(DECISION_TITLE_MAX) }).success,
    ).toBe(true);
  });

  it("rejects title above max length", () => {
    expect(
      decisionSchema.safeParse({ ...valid, title: "x".repeat(DECISION_TITLE_MAX + 1) }).success,
    ).toBe(false);
  });

  it("accepts problem_statement at exact min length", () => {
    expect(
      decisionSchema.safeParse({ ...valid, problem_statement: "x".repeat(DECISION_PROBLEM_MIN) })
        .success,
    ).toBe(true);
  });

  it("accepts problem_statement at exact max length", () => {
    expect(
      decisionSchema.safeParse({ ...valid, problem_statement: "x".repeat(DECISION_PROBLEM_MAX) })
        .success,
    ).toBe(true);
  });

  it("rejects problem_statement above max length", () => {
    expect(
      decisionSchema.safeParse({
        ...valid,
        problem_statement: "x".repeat(DECISION_PROBLEM_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("accepts context_summary at exact max length", () => {
    expect(
      decisionSchema.safeParse({ ...valid, context_summary: "x".repeat(DECISION_CONTEXT_MAX) })
        .success,
    ).toBe(true);
  });

  it("rejects context_summary above max length", () => {
    expect(
      decisionSchema.safeParse({ ...valid, context_summary: "x".repeat(DECISION_CONTEXT_MAX + 1) })
        .success,
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// projectSchema
// ═══════════════════════════════════════════════════════════════════

describe("projectSchema", () => {
  it("accepts minimal valid input", () => {
    const r = projectSchema.safeParse({ name: "Acme App" });
    expect(r.success).toBe(true);
  });

  it("accepts full input with all optional fields", () => {
    const r = projectSchema.safeParse({
      name: "Acme App",
      description: "A productivity tool",
      target_users: "Small businesses",
      market: "SaaS",
      business_model: "Subscription",
      goals: "Grow to 10k users",
    });
    expect(r.success).toBe(true);
  });

  it("trims name whitespace", () => {
    const r = projectSchema.safeParse({ name: "  Acme  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.name).toBe("Acme");
  });

  it("rejects empty name", () => {
    expect(projectSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects whitespace-only name", () => {
    expect(projectSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects name below min length", () => {
    expect(projectSchema.safeParse({ name: "A" }).success).toBe(false);
  });

  it("transforms empty optional fields to undefined", () => {
    const r = projectSchema.safeParse({ name: "Acme", description: "", target_users: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.description).toBeUndefined();
      expect(r.data.target_users).toBeUndefined();
    }
  });

  it("accepts name at exact min length", () => {
    expect(projectSchema.safeParse({ name: "x".repeat(PROJECT_NAME_MIN) }).success).toBe(true);
  });

  it("accepts name at exact max length", () => {
    expect(projectSchema.safeParse({ name: "x".repeat(PROJECT_NAME_MAX) }).success).toBe(true);
  });

  it("rejects name above max length", () => {
    expect(projectSchema.safeParse({ name: "x".repeat(PROJECT_NAME_MAX + 1) }).success).toBe(false);
  });

  it("accepts description at exact max length", () => {
    expect(
      projectSchema.safeParse({ name: "Acme", description: "x".repeat(PROJECT_DESC_MAX) }).success,
    ).toBe(true);
  });

  it("rejects description above max length", () => {
    expect(
      projectSchema.safeParse({ name: "Acme", description: "x".repeat(PROJECT_DESC_MAX + 1) })
        .success,
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// featureSchema
// ═══════════════════════════════════════════════════════════════════

describe("featureSchema", () => {
  const valid = {
    name: "Dark Mode",
    description: "Allow users to switch between light and dark themes.",
  };

  it("accepts valid input", () => {
    expect(featureSchema.safeParse(valid).success).toBe(true);
  });

  it("trims both fields", () => {
    const r = featureSchema.safeParse({
      name: "  Dark Mode  ",
      description: "  Allow users to switch themes for comfort.  ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe("Dark Mode");
      expect(r.data.description).not.toMatch(/^\s/);
    }
  });

  it("rejects empty name", () => {
    expect(featureSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects name below min (3)", () => {
    expect(featureSchema.safeParse({ ...valid, name: "ab" }).success).toBe(false);
  });

  it("rejects description below min (20)", () => {
    expect(featureSchema.safeParse({ ...valid, description: "Too short" }).success).toBe(false);
  });

  it("rejects whitespace-only name", () => {
    expect(featureSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("accepts name at exact min length", () => {
    expect(featureSchema.safeParse({ ...valid, name: "x".repeat(FEATURE_NAME_MIN) }).success).toBe(
      true,
    );
  });

  it("accepts name at exact max length", () => {
    expect(featureSchema.safeParse({ ...valid, name: "x".repeat(FEATURE_NAME_MAX) }).success).toBe(
      true,
    );
  });

  it("rejects name above max length", () => {
    expect(
      featureSchema.safeParse({ ...valid, name: "x".repeat(FEATURE_NAME_MAX + 1) }).success,
    ).toBe(false);
  });

  it("accepts description at exact min length", () => {
    expect(
      featureSchema.safeParse({ ...valid, description: "x".repeat(FEATURE_DESC_MIN) }).success,
    ).toBe(true);
  });

  it("accepts description at exact max length", () => {
    expect(
      featureSchema.safeParse({ ...valid, description: "x".repeat(FEATURE_DESC_MAX) }).success,
    ).toBe(true);
  });

  it("rejects description above max length", () => {
    expect(
      featureSchema.safeParse({ ...valid, description: "x".repeat(FEATURE_DESC_MAX + 1) }).success,
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// feedbackSchema
// ═══════════════════════════════════════════════════════════════════

describe("feedbackSchema", () => {
  const valid = {
    title: "Login is too slow",
    content: "Users report login takes over 10 seconds on mobile devices.",
  };

  it("accepts valid minimal input (source omitted)", () => {
    const r = feedbackSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.source).toBeNull();
  });

  it("accepts valid input with source", () => {
    const r = feedbackSchema.safeParse({ ...valid, source: "customer_interview" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.source).toBe("customer_interview");
  });

  it("accepts all valid source values", () => {
    for (const source of VALID_SOURCES) {
      expect(feedbackSchema.safeParse({ ...valid, source }).success).toBe(true);
    }
  });

  it("rejects invalid source", () => {
    expect(feedbackSchema.safeParse({ ...valid, source: "twitter" }).success).toBe(false);
  });

  it("rejects title below min (3)", () => {
    expect(feedbackSchema.safeParse({ ...valid, title: "ab" }).success).toBe(false);
  });

  it("rejects content below min (20)", () => {
    expect(feedbackSchema.safeParse({ ...valid, content: "Too short" }).success).toBe(false);
  });

  it("trims title and content", () => {
    const r = feedbackSchema.safeParse({
      title: "  Login is slow  ",
      content: "  Users report login takes way too long on mobile.  ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.title).toBe("Login is slow");
      expect(r.data.content).not.toMatch(/^\s/);
    }
  });

  it("accepts title at exact min length", () => {
    expect(
      feedbackSchema.safeParse({ ...valid, title: "x".repeat(FEEDBACK_TITLE_MIN) }).success,
    ).toBe(true);
  });

  it("accepts title at exact max length", () => {
    expect(
      feedbackSchema.safeParse({ ...valid, title: "x".repeat(FEEDBACK_TITLE_MAX) }).success,
    ).toBe(true);
  });

  it("rejects title above max length", () => {
    expect(
      feedbackSchema.safeParse({ ...valid, title: "x".repeat(FEEDBACK_TITLE_MAX + 1) }).success,
    ).toBe(false);
  });

  it("accepts content at exact min length", () => {
    expect(
      feedbackSchema.safeParse({ ...valid, content: "x".repeat(FEEDBACK_CONTENT_MIN) }).success,
    ).toBe(true);
  });

  it("accepts content at exact max length", () => {
    expect(
      feedbackSchema.safeParse({ ...valid, content: "x".repeat(FEEDBACK_CONTENT_MAX) }).success,
    ).toBe(true);
  });

  it("rejects content above max length", () => {
    expect(
      feedbackSchema.safeParse({ ...valid, content: "x".repeat(FEEDBACK_CONTENT_MAX + 1) }).success,
    ).toBe(false);
  });
});
