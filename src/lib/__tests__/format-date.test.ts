import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatTime, toISOString } from "../format-date";

// All formatters use en-US locale and UTC timezone for determinism.

describe("formatDate", () => {
  it("formats a valid ISO string", () => {
    expect(formatDate("2026-05-20T14:30:00Z")).toBe("May 20, 2026");
  });

  it("formats a Date object", () => {
    expect(formatDate(new Date("2026-01-15T10:00:00Z"))).toBe("Jan 15, 2026");
  });

  it("returns fallback for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns fallback for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });

  it("returns fallback for empty string", () => {
    expect(formatDate("")).toBe("—");
  });

  it("returns fallback for invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("is deterministic — same input, same output", () => {
    const input = "2026-03-01T00:00:00Z";
    expect(formatDate(input)).toBe(formatDate(input));
  });

  it("uses UTC timezone (midnight UTC stays same day)", () => {
    // Jan 1 midnight UTC should be Jan 1, not Dec 31
    expect(formatDate("2026-01-01T00:00:00Z")).toBe("Jan 1, 2026");
  });
});

describe("formatDateTime", () => {
  it("formats date with time", () => {
    const result = formatDateTime("2026-05-20T14:30:00Z");
    expect(result).toContain("May 20, 2026");
    expect(result).toContain("2:30 PM");
  });

  it("returns fallback for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });

  it("returns fallback for invalid date", () => {
    expect(formatDateTime("garbage")).toBe("—");
  });
});

describe("formatTime", () => {
  it("formats time only", () => {
    const result = formatTime("2026-05-20T14:30:00Z");
    expect(result).toContain("02:30 PM");
  });

  it("returns fallback for null", () => {
    expect(formatTime(null)).toBe("—");
  });

  it("returns fallback for invalid date", () => {
    expect(formatTime("invalid")).toBe("—");
  });
});

describe("toISOString", () => {
  it("returns ISO string for valid date", () => {
    expect(toISOString("2026-05-20T14:30:00Z")).toBe("2026-05-20T14:30:00.000Z");
  });

  it("returns ISO string for Date object", () => {
    expect(toISOString(new Date("2026-01-15T10:00:00Z"))).toBe("2026-01-15T10:00:00.000Z");
  });

  it("returns empty string for null", () => {
    expect(toISOString(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(toISOString(undefined)).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(toISOString("not-a-date")).toBe("");
  });
});

