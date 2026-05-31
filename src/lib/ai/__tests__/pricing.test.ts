import { describe, it, expect } from "vitest";
import { calculateAICost } from "../pricing";

describe("calculateAICost", () => {
  // ── Known model exact match ──────────────────────────────────────

  it("calculates cost for gpt-4o with known pricing", () => {
    const result = calculateAICost({
      model: "gpt-4o",
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    });
    expect(result.inputCost).toBe(2.5);
    expect(result.outputCost).toBe(10);
    expect(result.totalCost).toBe(12.5);
    expect(result.currency).toBe("USD");
  });

  it("calculates cost for gpt-4o-mini", () => {
    const result = calculateAICost({
      model: "gpt-4o-mini",
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    });
    expect(result.inputCost).toBe(0.15);
    expect(result.outputCost).toBe(0.6);
    expect(result.totalCost).toBe(0.75);
  });

  it("calculates cost for embedding model (zero output cost)", () => {
    const result = calculateAICost({
      model: "text-embedding-3-small",
      promptTokens: 1_000_000,
      completionTokens: 0,
    });
    expect(result.inputCost).toBe(0.02);
    expect(result.outputCost).toBe(0);
    expect(result.totalCost).toBe(0.02);
  });

  // ── Partial model match ──────────────────────────────────────────

  it("matches dated model variant via startsWith fallback", () => {
    // "gpt-4o-2025-01-01" should match "gpt-4o" pricing
    const result = calculateAICost({
      model: "gpt-4o-2025-01-01",
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    });
    expect(result.inputCost).toBe(2.5);
    expect(result.outputCost).toBe(10);
  });

  it("matches dated mini variant to gpt-4o-mini, not gpt-4o", () => {
    // "gpt-4o-mini-2025-01-01" must match "gpt-4o-mini" ($0.15),
    // not "gpt-4o" ($2.50) — longest prefix wins.
    const result = calculateAICost({
      model: "gpt-4o-mini-2025-01-01",
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    });
    expect(result.inputCost).toBe(0.15);
    expect(result.outputCost).toBe(0.6);
  });

  // ── Unknown model fallback ───────────────────────────────────────

  it("uses fallback pricing for unknown model", () => {
    const result = calculateAICost({
      model: "totally-unknown-model",
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    });
    // Fallback: $5.00 input, $15.00 output per 1M tokens
    expect(result.inputCost).toBe(5);
    expect(result.outputCost).toBe(15);
    expect(result.totalCost).toBe(20);
  });

  // ── Zero tokens ──────────────────────────────────────────────────

  it("returns zero cost for zero tokens", () => {
    const result = calculateAICost({
      model: "gpt-4o",
      promptTokens: 0,
      completionTokens: 0,
    });
    expect(result.inputCost).toBe(0);
    expect(result.outputCost).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  // ── Typical request ──────────────────────────────────────────────

  it("calculates typical small request correctly", () => {
    // 1000 prompt tokens + 500 completion tokens on gpt-4o
    const result = calculateAICost({
      model: "gpt-4o",
      promptTokens: 1000,
      completionTokens: 500,
    });
    // input: (1000 / 1M) * 2.50 = 0.0025
    // output: (500 / 1M) * 10.00 = 0.005
    expect(result.inputCost).toBe(0.0025);
    expect(result.outputCost).toBe(0.005);
    expect(result.totalCost).toBe(0.0075);
  });

  // ── Rounding ─────────────────────────────────────────────────────

  it("rounds to 6 decimal places", () => {
    const result = calculateAICost({
      model: "gpt-4o",
      promptTokens: 1,
      completionTokens: 1,
    });
    // input: (1/1M) * 2.50 = 0.0000025
    // output: (1/1M) * 10 = 0.00001
    // Rounded to 6 decimals individually: 0.000003, 0.00001
    // totalCost rounds raw sum: (0.0000025 + 0.00001) = 0.0000125 → 0.000012 (not sum of rounded parts)
    expect(result.inputCost).toBe(0.000003);
    expect(result.outputCost).toBe(0.00001);
    expect(result.totalCost).toBe(0.000012);
  });

  // ── No NaN/Infinity ──────────────────────────────────────────────

  it("does not return NaN or Infinity for normal inputs", () => {
    const result = calculateAICost({
      model: "gpt-4o",
      promptTokens: 50000,
      completionTokens: 25000,
    });
    expect(Number.isFinite(result.inputCost)).toBe(true);
    expect(Number.isFinite(result.outputCost)).toBe(true);
    expect(Number.isFinite(result.totalCost)).toBe(true);
  });

  // ── Currency ─────────────────────────────────────────────────────

  it("always returns USD currency", () => {
    const result = calculateAICost({
      model: "gpt-4o",
      promptTokens: 100,
      completionTokens: 100,
    });
    expect(result.currency).toBe("USD");
  });

  // ── Provider default ─────────────────────────────────────────────

  it("defaults provider to openai", () => {
    // No provider specified — should still match openai models
    const result = calculateAICost({
      model: "gpt-4o",
      promptTokens: 1_000_000,
      completionTokens: 0,
    });
    expect(result.inputCost).toBe(2.5);
  });
});


