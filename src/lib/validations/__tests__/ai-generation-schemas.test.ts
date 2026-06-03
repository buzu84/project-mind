import { describe, it, expect } from "vitest";
import {
  prdSchema,
  PRD_PRODUCT_NAME_MAX,
  PRD_DESCRIPTION_MIN,
  PRD_DESCRIPTION_MAX,
  PRD_TARGET_AUDIENCE_MAX,
} from "../prd";
import {
  analysisSchema,
  ANALYSIS_PRODUCT_NAME_MAX,
  ANALYSIS_INDUSTRY_MAX,
  ANALYSIS_COMPETITORS_MAX,
} from "../analysis";
import { contextSchema, CONTEXT_SECTION_MAX } from "../context";
import {
  multiAgentSchema,
  MULTI_AGENT_QUESTION_MIN,
  MULTI_AGENT_QUESTION_MAX,
} from "../multi-agent";

// ═══════════════════════════════════════════════════════════════════
// prdSchema
// ═══════════════════════════════════════════════════════════════════

describe("prdSchema", () => {
  const valid = {
    projectId: "proj-123",
    productName: "Acme Widget",
    productDescription: "A tool for managing widget inventories efficiently.",
  };

  it("accepts valid minimal input", () => {
    expect(prdSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts valid input with targetAudience", () => {
    expect(prdSchema.safeParse({ ...valid, targetAudience: "Small businesses" }).success).toBe(
      true,
    );
  });

  it("trims productName and productDescription", () => {
    const r = prdSchema.safeParse({
      ...valid,
      productName: "  Acme  ",
      productDescription: "  A detailed product description for testing.  ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.productName).toBe("Acme");
      expect(r.data.productDescription).not.toMatch(/^\s/);
    }
  });

  it("rejects empty productName", () => {
    expect(prdSchema.safeParse({ ...valid, productName: "" }).success).toBe(false);
  });

  it("rejects whitespace-only productName", () => {
    expect(prdSchema.safeParse({ ...valid, productName: "   " }).success).toBe(false);
  });

  it("rejects productDescription below min (10)", () => {
    expect(prdSchema.safeParse({ ...valid, productDescription: "Short" }).success).toBe(false);
  });

  it("rejects missing projectId", () => {
    const { projectId: _, ...rest } = valid;
    expect(prdSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty projectId", () => {
    expect(prdSchema.safeParse({ ...valid, projectId: "" }).success).toBe(false);
  });

  it("accepts productDescription at exact max length", () => {
    expect(
      prdSchema.safeParse({ ...valid, productDescription: "x".repeat(PRD_DESCRIPTION_MAX) })
        .success,
    ).toBe(true);
  });

  it("rejects productDescription above max length", () => {
    expect(
      prdSchema.safeParse({ ...valid, productDescription: "x".repeat(PRD_DESCRIPTION_MAX + 1) })
        .success,
    ).toBe(false);
  });

  it("accepts productName at exact max length", () => {
    expect(
      prdSchema.safeParse({ ...valid, productName: "x".repeat(PRD_PRODUCT_NAME_MAX) }).success,
    ).toBe(true);
  });

  it("rejects productName above max length", () => {
    expect(
      prdSchema.safeParse({ ...valid, productName: "x".repeat(PRD_PRODUCT_NAME_MAX + 1) }).success,
    ).toBe(false);
  });

  it("accepts targetAudience at exact max length", () => {
    expect(
      prdSchema.safeParse({ ...valid, targetAudience: "x".repeat(PRD_TARGET_AUDIENCE_MAX) })
        .success,
    ).toBe(true);
  });

  it("rejects targetAudience above max length", () => {
    expect(
      prdSchema.safeParse({ ...valid, targetAudience: "x".repeat(PRD_TARGET_AUDIENCE_MAX + 1) })
        .success,
    ).toBe(false);
  });

  it("accepts productDescription at exact min length", () => {
    expect(
      prdSchema.safeParse({ ...valid, productDescription: "x".repeat(PRD_DESCRIPTION_MIN) })
        .success,
    ).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// analysisSchema
// ═══════════════════════════════════════════════════════════════════

describe("analysisSchema", () => {
  const valid = {
    projectId: "proj-123",
    productName: "Acme Widget",
    industry: "SaaS",
  };

  it("accepts valid minimal input", () => {
    expect(analysisSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts valid input with competitors", () => {
    expect(analysisSchema.safeParse({ ...valid, competitors: "Competitor A, B" }).success).toBe(
      true,
    );
  });

  it("trims fields", () => {
    const r = analysisSchema.safeParse({
      ...valid,
      productName: "  Acme  ",
      industry: "  SaaS  ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.productName).toBe("Acme");
      expect(r.data.industry).toBe("SaaS");
    }
  });

  it("rejects productName below min (2)", () => {
    expect(analysisSchema.safeParse({ ...valid, productName: "A" }).success).toBe(false);
  });

  it("rejects industry below min (2)", () => {
    expect(analysisSchema.safeParse({ ...valid, industry: "X" }).success).toBe(false);
  });

  it("rejects empty projectId", () => {
    expect(analysisSchema.safeParse({ ...valid, projectId: "" }).success).toBe(false);
  });

  it("accepts productName at exact max length", () => {
    expect(
      analysisSchema.safeParse({ ...valid, productName: "x".repeat(ANALYSIS_PRODUCT_NAME_MAX) })
        .success,
    ).toBe(true);
  });

  it("rejects productName above max length", () => {
    expect(
      analysisSchema.safeParse({ ...valid, productName: "x".repeat(ANALYSIS_PRODUCT_NAME_MAX + 1) })
        .success,
    ).toBe(false);
  });

  it("accepts industry at exact max length", () => {
    expect(
      analysisSchema.safeParse({ ...valid, industry: "x".repeat(ANALYSIS_INDUSTRY_MAX) }).success,
    ).toBe(true);
  });

  it("rejects industry above max length", () => {
    expect(
      analysisSchema.safeParse({ ...valid, industry: "x".repeat(ANALYSIS_INDUSTRY_MAX + 1) })
        .success,
    ).toBe(false);
  });

  it("accepts competitors at exact max length", () => {
    expect(
      analysisSchema.safeParse({ ...valid, competitors: "x".repeat(ANALYSIS_COMPETITORS_MAX) })
        .success,
    ).toBe(true);
  });

  it("rejects competitors above max length", () => {
    expect(
      analysisSchema.safeParse({ ...valid, competitors: "x".repeat(ANALYSIS_COMPETITORS_MAX + 1) })
        .success,
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// contextSchema
// ═══════════════════════════════════════════════════════════════════

describe("contextSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const r = contextSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      // All sections should transform to null
      expect(r.data.product_overview).toBeNull();
      expect(r.data.target_personas).toBeNull();
    }
  });

  it("accepts valid sections", () => {
    const r = contextSchema.safeParse({
      product_overview: "A B2B SaaS tool for project management.",
      strategic_goals: "Reach $1M ARR by end of year.",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.product_overview).toBe("A B2B SaaS tool for project management.");
      expect(r.data.strategic_goals).toBe("Reach $1M ARR by end of year.");
    }
  });

  it("transforms empty string sections to null", () => {
    const r = contextSchema.safeParse({ product_overview: "", pain_points: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.product_overview).toBeNull();
      expect(r.data.pain_points).toBeNull();
    }
  });

  it("transforms whitespace-only sections to null", () => {
    const r = contextSchema.safeParse({ product_overview: "   " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.product_overview).toBeNull();
  });

  it("trims section content", () => {
    const r = contextSchema.safeParse({ product_overview: "  Trimmed content  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.product_overview).toBe("Trimmed content");
  });

  it("accepts section at exact max length", () => {
    expect(
      contextSchema.safeParse({ product_overview: "x".repeat(CONTEXT_SECTION_MAX) }).success,
    ).toBe(true);
  });

  it("rejects section exceeding max length", () => {
    const r = contextSchema.safeParse({
      product_overview: "x".repeat(CONTEXT_SECTION_MAX + 1),
    });
    expect(r.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// multiAgentSchema
// ═══════════════════════════════════════════════════════════════════

describe("multiAgentSchema", () => {
  const valid = {
    projectId: "proj-123",
    question: "Should we build a mobile app for our B2B SaaS?",
    inputType: "product_question" as const,
  };

  it("accepts valid minimal input (boolean defaults applied)", () => {
    const r = multiAgentSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.includeContext).toBe(true);
      expect(r.data.includeRag).toBe(true);
      expect(r.data.includeInsights).toBe(true);
    }
  });

  it("accepts valid input with explicit booleans", () => {
    const r = multiAgentSchema.safeParse({
      ...valid,
      includeContext: false,
      includeRag: false,
      includeInsights: false,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.includeContext).toBe(false);
    }
  });

  it("accepts feature_idea inputType", () => {
    expect(multiAgentSchema.safeParse({ ...valid, inputType: "feature_idea" }).success).toBe(true);
  });

  it("rejects invalid inputType", () => {
    expect(multiAgentSchema.safeParse({ ...valid, inputType: "bug_report" }).success).toBe(false);
  });

  it("trims question", () => {
    const r = multiAgentSchema.safeParse({
      ...valid,
      question: "  Should we build a mobile app for B2B SaaS?  ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.question).toBe("Should we build a mobile app for B2B SaaS?");
  });

  it("rejects question below min (10)", () => {
    expect(multiAgentSchema.safeParse({ ...valid, question: "Why?" }).success).toBe(false);
  });

  it("rejects whitespace-only question", () => {
    expect(multiAgentSchema.safeParse({ ...valid, question: "          " }).success).toBe(false);
  });

  it("rejects empty projectId", () => {
    expect(multiAgentSchema.safeParse({ ...valid, projectId: "" }).success).toBe(false);
  });

  it("accepts question at exact min length", () => {
    expect(
      multiAgentSchema.safeParse({ ...valid, question: "x".repeat(MULTI_AGENT_QUESTION_MIN) })
        .success,
    ).toBe(true);
  });

  it("accepts question at exact max length", () => {
    expect(
      multiAgentSchema.safeParse({ ...valid, question: "x".repeat(MULTI_AGENT_QUESTION_MAX) })
        .success,
    ).toBe(true);
  });

  it("rejects question above max length", () => {
    expect(
      multiAgentSchema.safeParse({ ...valid, question: "x".repeat(MULTI_AGENT_QUESTION_MAX + 1) })
        .success,
    ).toBe(false);
  });
});
