import { describe, it, expect } from "vitest";
import { formatNumber } from "../format-number";

describe("formatNumber", () => {
  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats positive integer with commas", () => {
    expect(formatNumber(12345)).toBe("12,345");
  });

  it("formats large number", () => {
    expect(formatNumber(1_000_000)).toBe("1,000,000");
  });

  it("formats decimal number", () => {
    expect(formatNumber(1234.56)).toBe("1,234.56");
  });

  it("formats negative number", () => {
    expect(formatNumber(-500)).toBe("-500");
  });

  it("returns '0' for null", () => {
    expect(formatNumber(null)).toBe("0");
  });

  it("returns '0' for undefined", () => {
    expect(formatNumber(undefined)).toBe("0");
  });

  it("returns '0' for NaN", () => {
    expect(formatNumber(NaN)).toBe("0");
  });

  it("returns '0' for Infinity", () => {
    expect(formatNumber(Infinity)).toBe("0");
  });

  it("returns '0' for -Infinity", () => {
    expect(formatNumber(-Infinity)).toBe("0");
  });

  it("is deterministic — same input, same output", () => {
    expect(formatNumber(42)).toBe(formatNumber(42));
  });
});

