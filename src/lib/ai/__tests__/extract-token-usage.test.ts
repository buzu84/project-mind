import { describe, it, expect } from "vitest";
import { extractTokenUsage } from "../usage-tracking";

// ── extractTokenUsage ────────────────────────────────────────────────

describe("extractTokenUsage", () => {
  it("extracts prompt_tokens and completion_tokens from a full usage object", () => {
    const result = extractTokenUsage({
      usage: { prompt_tokens: 120, completion_tokens: 45, total_tokens: 165 },
    });
    expect(result).toEqual({ promptTokens: 120, completionTokens: 45 });
  });

  it("returns { 0, 0 } when usage is undefined", () => {
    const result = extractTokenUsage({});
    expect(result).toEqual({ promptTokens: 0, completionTokens: 0 });
  });

  it("returns { 0, 0 } when usage is null", () => {
    const result = extractTokenUsage({ usage: null });
    expect(result).toEqual({ promptTokens: 0, completionTokens: 0 });
  });

  it("returns completionTokens 0 when only prompt_tokens is present", () => {
    const result = extractTokenUsage({ usage: { prompt_tokens: 80 } });
    expect(result).toEqual({ promptTokens: 80, completionTokens: 0 });
  });

  it("returns promptTokens 0 when only completion_tokens is present", () => {
    const result = extractTokenUsage({ usage: { completion_tokens: 30 } });
    expect(result).toEqual({ promptTokens: 0, completionTokens: 30 });
  });

  it("ignores total_tokens — does not map it to either output field", () => {
    const result = extractTokenUsage({
      usage: { total_tokens: 999 },
    });
    // total_tokens should NOT leak into promptTokens or completionTokens
    expect(result).toEqual({ promptTokens: 0, completionTokens: 0 });
  });
});
