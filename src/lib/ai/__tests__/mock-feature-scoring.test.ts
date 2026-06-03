import { describe, it, expect } from "vitest";
import { generateMockFeatureScores } from "../mock-feature-scoring";

// ── Helpers ──────────────────────────────────────────────────────────

/** Round to 2 decimal places using the same strategy as the production code. */
function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Minimal feature factory. */
function feature(name: string, description: string | null = null) {
  return { name, description };
}

/**
 * Search through candidate names until we find one whose generated score
 * satisfies a predicate.  Avoids hardcoding private hash outputs.
 */
function findFeatureMatching(
  predicate: (s: ReturnType<typeof generateMockFeatureScores>[0]) => boolean,
  candidates: string[] = Array.from({ length: 200 }, (_, i) => `probe-${i}`),
): ReturnType<typeof generateMockFeatureScores>[0] {
  for (const name of candidates) {
    const [score] = generateMockFeatureScores([feature(name)]);
    if (predicate(score)) return score;
  }
  throw new Error("No candidate matched the predicate");
}

// ── A. Shape and determinism ─────────────────────────────────────────

describe("generateMockFeatureScores", () => {
  describe("shape and determinism", () => {
    it("returns [] for empty features array", () => {
      expect(generateMockFeatureScores([])).toEqual([]);
    });

    it("returns exactly one scored result per input feature", () => {
      const input = [feature("A"), feature("B"), feature("C")];
      expect(generateMockFeatureScores(input)).toHaveLength(3);
    });

    it("each result contains all expected public fields", () => {
      const [result] = generateMockFeatureScores([feature("Login")]);
      expect(result).toEqual(
        expect.objectContaining({
          name: "Login",
          reach: expect.any(Number),
          impact: expect.any(Number),
          confidence: expect.any(Number),
          effort: expect.any(Number),
          rice_score: expect.any(Number),
          ice_score: expect.any(Number),
          ai_commentary: expect.any(String),
        }),
      );
      // Exactly 8 keys — no extra fields
      expect(Object.keys(result)).toHaveLength(8);
    });

    it("same input produces identical output across calls", () => {
      const input = [feature("Determinism", "some description")];
      const a = generateMockFeatureScores(input);
      const b = generateMockFeatureScores(input);
      expect(a).toEqual(b);
    });

    it("different feature names produce different score sets", () => {
      const names = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
      const results = generateMockFeatureScores(names.map((n) => feature(n)));
      // With 5 features and 7 possible values per dimension,
      // at least one dimension must show variation across the batch.
      const uniqueReach = new Set(results.map((r) => r.reach));
      expect(uniqueReach.size).toBeGreaterThan(1);
    });
  });

  // ── B. Edge cases ──────────────────────────────────────────────────

  describe("edge cases", () => {
    it("null description does not throw and is treated as empty", () => {
      const withNull = generateMockFeatureScores([feature("X", null)]);
      const withEmpty = generateMockFeatureScores([feature("X", "")]);
      expect(withNull).toEqual(withEmpty);
    });

    it("undefined projectName does not throw", () => {
      expect(() => generateMockFeatureScores([feature("Y")], undefined)).not.toThrow();
    });

    it("projectName feeds into reach seed and changes scores", () => {
      // projectName only affects the reach seed.
      // Search across names to find one where two projectNames diverge.
      const found = Array.from({ length: 20 }, (_, i) => `feat-${i}`).some((name) => {
        const [a] = generateMockFeatureScores([feature(name)], "Alpha");
        const [b] = generateMockFeatureScores([feature(name)], "Zeta");
        return a.reach !== b.reach;
      });
      expect(found).toBe(true);
    });
  });

  // ── C. Confidence threshold ────────────────────────────────────────

  describe("confidence threshold (descLen > 60)", () => {
    const shortDesc = "A".repeat(60); // exactly 60 — should use low range
    const longDesc = "A".repeat(61); // 61 — should use high range

    it("description > 60 chars produces confidence in [5, 9]", () => {
      const [result] = generateMockFeatureScores([feature("Conf", longDesc)]);
      expect(result.confidence).toBeGreaterThanOrEqual(5);
      expect(result.confidence).toBeLessThanOrEqual(9);
    });

    it("description <= 60 chars produces confidence in [3, 6] — strict >, not >=", () => {
      // 60 chars is the boundary: descLen > 60 is false, so low range applies
      const [result] = generateMockFeatureScores([feature("Conf", shortDesc)]);
      expect(result.confidence).toBeGreaterThanOrEqual(3);
      expect(result.confidence).toBeLessThanOrEqual(6);
    });
  });

  // ── D. Formula correctness ─────────────────────────────────────────

  describe("formula correctness", () => {
    const fixtures = [
      feature("Search", "Full-text search across all documents"),
      feature("Dashboard", "A".repeat(80)), // long description
      feature("Export", null),
    ];

    it("rice_score equals roundTo2((reach * impact * confidence) / effort)", () => {
      const results = generateMockFeatureScores(fixtures);
      for (const r of results) {
        const expected = roundTo2((r.reach * r.impact * r.confidence) / r.effort);
        expect(r.rice_score).toBe(expected);
      }
    });

    it("ice_score equals roundTo2(impact * confidence * (11 - effort))", () => {
      const results = generateMockFeatureScores(fixtures);
      for (const r of results) {
        const ease = 11 - r.effort;
        const expected = roundTo2(r.impact * r.confidence * ease);
        expect(r.ice_score).toBe(expected);
      }
    });
  });

  // ── E. Range constraints ───────────────────────────────────────────

  describe("range constraints", () => {
    // Use a variety of features to exercise different hash paths
    const results = generateMockFeatureScores(
      Array.from({ length: 20 }, (_, i) =>
        feature(`Feature-${i}`, i % 2 === 0 ? "A".repeat(80) : null),
      ),
    );

    it("reach is within [3, 9]", () => {
      for (const r of results) {
        expect(r.reach).toBeGreaterThanOrEqual(3);
        expect(r.reach).toBeLessThanOrEqual(9);
      }
    });

    it("impact is within [3, 9]", () => {
      for (const r of results) {
        expect(r.impact).toBeGreaterThanOrEqual(3);
        expect(r.impact).toBeLessThanOrEqual(9);
      }
    });

    it("confidence is within [3, 9]", () => {
      for (const r of results) {
        expect(r.confidence).toBeGreaterThanOrEqual(3);
        expect(r.confidence).toBeLessThanOrEqual(9);
      }
    });

    it("effort is within [2, 8]", () => {
      for (const r of results) {
        expect(r.effort).toBeGreaterThanOrEqual(2);
        expect(r.effort).toBeLessThanOrEqual(8);
      }
    });
  });

  // ── F. Commentary behavior (minimal, non-brittle) ──────────────────

  describe("commentary thresholds", () => {
    it('contains "critical" when impact >= 7', () => {
      const score = findFeatureMatching((s) => s.impact >= 7);
      expect(score.ai_commentary).toContain("critical");
    });

    it('contains "minor" when impact < 4', () => {
      const score = findFeatureMatching((s) => s.impact < 4);
      expect(score.ai_commentary).toContain("minor");
    });

    it('contains "High priority" when rice_score > 30', () => {
      const score = findFeatureMatching((s) => s.rice_score > 30);
      expect(score.ai_commentary).toContain("High priority");
    });

    it('contains "Worth considering" when rice_score is in (15, 30]', () => {
      const score = findFeatureMatching((s) => s.rice_score > 15 && s.rice_score <= 30);
      expect(score.ai_commentary).toContain("Worth considering");
    });

    it('contains "Lower priority" when rice_score <= 15', () => {
      const score = findFeatureMatching((s) => s.rice_score <= 15);
      expect(score.ai_commentary).toContain("Lower priority");
    });
  });
});
