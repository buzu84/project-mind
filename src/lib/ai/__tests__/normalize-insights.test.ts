import { describe, it, expect } from "vitest";
import { normalizeInsightsFromAI } from "../normalize-insights";

// ── Valid input ─────────────────────────────────────────────────────

describe("normalizeInsightsFromAI", () => {
  it("parses a valid JSON array of insights", () => {
    const raw = JSON.stringify([
      {
        title: "Market Gap",
        type: "opportunity",
        explanation: "There is a gap in the market.",
        priority: "high",
        confidence: "high",
        suggested_action: "Investigate further",
      },
    ]);
    const { insights, rawParsedCount } = normalizeInsightsFromAI(raw);
    expect(rawParsedCount).toBe(1);
    expect(insights).toHaveLength(1);
    expect(insights[0]).toEqual({
      title: "Market Gap",
      type: "opportunity",
      content: "There is a gap in the market.",
      metadata: {
        priority: "high",
        confidence: "high",
        suggested_action: "Investigate further",
      },
    });
  });

  // ── Wrapper objects ─────────────────────────────────────────────────

  it("unwraps { insights: [...] } wrapper", () => {
    const raw = JSON.stringify({
      insights: [{ title: "Risk A", type: "risk", content: "Details" }],
    });
    const { insights } = normalizeInsightsFromAI(raw);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("Risk A");
  });

  it("unwraps { data: [...] } wrapper", () => {
    const raw = JSON.stringify({
      data: [{ title: "Item", description: "Text" }],
    });
    const { insights } = normalizeInsightsFromAI(raw);
    expect(insights).toHaveLength(1);
  });

  it("unwraps { results: [...] } wrapper", () => {
    const raw = JSON.stringify({
      results: [{ title: "Item", explanation: "Text" }],
    });
    const { insights } = normalizeInsightsFromAI(raw);
    expect(insights).toHaveLength(1);
  });

  it("falls back to first array-valued property in unknown wrapper", () => {
    const raw = JSON.stringify({
      custom_key: [{ title: "Custom", summary: "Text" }],
    });
    const { insights } = normalizeInsightsFromAI(raw);
    expect(insights).toHaveLength(1);
  });

  // ── Markdown-fenced JSON ────────────────────────────────────────────

  it("strips ```json fences", () => {
    const raw = '```json\n[{"title": "Fenced", "content": "Body"}]\n```';
    const { insights } = normalizeInsightsFromAI(raw);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("Fenced");
  });

  it("strips ``` fences without json label", () => {
    const raw = '```\n[{"title": "Bare", "explanation": "Text"}]\n```';
    const { insights } = normalizeInsightsFromAI(raw);
    expect(insights).toHaveLength(1);
  });

  it("strips markdown fences around wrapper object", () => {
    const raw = '```json\n{"insights": [{"title": "Wrapped", "content": "Body"}]}\n```';
    const { insights } = normalizeInsightsFromAI(raw);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("Wrapped");
  });

  // ── Field name variants ───────────────────────────────────────────

  it("reads content from alternate field names", () => {
    const cases = [
      { title: "A", description: "from description" },
      { title: "B", detail: "from detail" },
      { title: "C", reasoning: "from reasoning" },
      { title: "D", summary: "from summary" },
      { title: "E", body: "from body" },
      { title: "F", text: "from text" },
    ];
    const { insights } = normalizeInsightsFromAI(JSON.stringify(cases));
    expect(insights).toHaveLength(6);
    expect(insights[0].content).toBe("from description");
    expect(insights[3].content).toBe("from summary");
  });

  it("reads title from alternate field names", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([
        { headline: "H", content: "text" },
        { name: "N", content: "text" },
      ]),
    );
    expect(insights[0].title).toBe("H");
    expect(insights[1].title).toBe("N");
  });

  it("reads suggested_action from alternate field names", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([
        { title: "A", content: "t", suggestedAction: "camelCase action" },
        { title: "B", content: "t", action: "action field" },
        { title: "C", content: "t", next_step: "next step" },
      ]),
    );
    expect(insights[0].metadata.suggested_action).toBe("camelCase action");
    expect(insights[1].metadata.suggested_action).toBe("action field");
    expect(insights[2].metadata.suggested_action).toBe("next step");
  });

  // ── Confidence normalization ──────────────────────────────────────

  it("normalizes string confidence values", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([
        { title: "A", content: "t", confidence: "High" },
        { title: "B", content: "t", confidence: "LOW" },
        { title: "C", content: "t", confidence: "invalid" },
      ]),
    );
    expect(insights[0].metadata.confidence).toBe("high");
    expect(insights[1].metadata.confidence).toBe("low");
    expect(insights[2].metadata.confidence).toBe("medium"); // fallback
  });

  it("normalizes numeric confidence 0-1 range", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([
        { title: "A", content: "t", confidence: 0.9 },
        { title: "B", content: "t", confidence: 0.5 },
        { title: "C", content: "t", confidence: 0.2 },
      ]),
    );
    expect(insights[0].metadata.confidence).toBe("high");
    expect(insights[1].metadata.confidence).toBe("medium");
    expect(insights[2].metadata.confidence).toBe("low");
  });

  it("normalizes numeric confidence 0-100 range", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([
        { title: "A", content: "t", confidence: 85 },
        { title: "B", content: "t", confidence: 50 },
        { title: "C", content: "t", confidence: 10 },
      ]),
    );
    expect(insights[0].metadata.confidence).toBe("high");
    expect(insights[1].metadata.confidence).toBe("medium");
    expect(insights[2].metadata.confidence).toBe("low");
  });

  // ── Type normalization ────────────────────────────────────────────

  it("passes through valid types", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([
        { title: "A", content: "t", type: "risk" },
        { title: "B", content: "t", type: "pain_point" },
        { title: "C", content: "t", type: "strategic_gap" },
      ]),
    );
    expect(insights.map((i) => i.type)).toEqual(["risk", "pain_point", "strategic_gap"]);
  });

  it("falls back to 'opportunity' for unknown types", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([{ title: "A", content: "t", type: "banana" }]),
    );
    expect(insights[0].type).toBe("opportunity");
  });

  it("falls back to 'opportunity' when type is missing", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([{ title: "A", content: "t" }]),
    );
    expect(insights[0].type).toBe("opportunity");
  });

  // ── Priority normalization ────────────────────────────────────────

  it("passes through valid priorities", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([{ title: "A", content: "t", priority: "critical" }]),
    );
    expect(insights[0].metadata.priority).toBe("critical");
  });

  it("falls back to 'medium' for unknown priority", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([{ title: "A", content: "t", priority: "urgent" }]),
    );
    expect(insights[0].metadata.priority).toBe("medium");
  });

  // ── Edge cases ────────────────────────────────────────────────────

  it("skips items with no title and no content", () => {
    const { insights, rawParsedCount } = normalizeInsightsFromAI(
      JSON.stringify([
        { type: "risk" },                          // no title or content
        { title: "Valid", content: "Has content" }, // valid
        {},                                         // empty
      ]),
    );
    expect(rawParsedCount).toBe(3);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("Valid");
  });

  it("skips non-object items in array", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify(["string", 42, null, { title: "OK", content: "text" }]),
    );
    expect(insights).toHaveLength(1);
  });

  it("uses explanation as title when title is missing", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([{ explanation: "This is a long explanation that serves as both title and content" }]),
    );
    expect(insights).toHaveLength(1);
    expect(insights[0].title.length).toBeLessThanOrEqual(200);
    expect(insights[0].content).toBe("This is a long explanation that serves as both title and content");
  });

  it("truncates title to 200 characters", () => {
    const longTitle = "A".repeat(300);
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([{ title: longTitle, content: "text" }]),
    );
    expect(insights[0].title.length).toBe(200);
  });

  // ── Malformed input ───────────────────────────────────────────────

  it("returns error for invalid JSON", () => {
    const result = normalizeInsightsFromAI("not json at all");
    expect(result.insights).toEqual([]);
    expect(result.rawParsedCount).toBe(0);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("JSON parse failed");
  });

  it("returns empty insights for empty array", () => {
    const result = normalizeInsightsFromAI("[]");
    expect(result.insights).toEqual([]);
    expect(result.rawParsedCount).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("returns empty insights for object with no array properties", () => {
    const result = normalizeInsightsFromAI(JSON.stringify({ note: "no insights here" }));
    expect(result.insights).toEqual([]);
  });

  it("handles empty string gracefully", () => {
    const result = normalizeInsightsFromAI("");
    expect(result.insights).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it("handles fields with wrong types without crashing", () => {
    const { insights } = normalizeInsightsFromAI(
      JSON.stringify([
        { title: ["not", "a", "string"], content: { nested: true } },
        { title: "Valid", content: "real content" },
      ]),
    );
    // First item: pickText returns "" for non-string fields → skipped (no title or content)
    // Second item: valid
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe("Valid");
  });
});

