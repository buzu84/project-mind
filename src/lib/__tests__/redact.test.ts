import { describe, it, expect } from "vitest";
import { redactSecrets } from "../redact";

describe("redactSecrets", () => {
  // ── sk- key redaction ──────────────────────────────────────────────

  it("redacts sk- keys with 10+ chars after prefix", () => {
    const input = "Error: sk-abc1234567890 is invalid";
    const result = redactSecrets(input);
    expect(result).not.toContain("sk-abc1234567890");
    expect(result).toContain("[REDACTED]");
  });

  it("does NOT redact short sk- strings under threshold", () => {
    const input = "Error: sk-short is fine";
    const result = redactSecrets(input);
    expect(result).toContain("sk-short");
  });

  // ── key- pattern redaction ─────────────────────────────────────────

  it("redacts key- patterns with 10+ chars after prefix", () => {
    const input = "Auth failed: key-abcdefghij1234";
    const result = redactSecrets(input);
    expect(result).not.toContain("key-abcdefghij1234");
    expect(result).toContain("[REDACTED]");
  });

  it("does NOT redact 'key-value' which appears in normal error messages", () => {
    const input = "Missing key-value pair in config";
    expect(redactSecrets(input)).toBe(input);
  });

  // ── Bearer token redaction ─────────────────────────────────────────

  it("redacts Bearer tokens", () => {
    const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.token";
    const result = redactSecrets(input);
    expect(result).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(result).toContain("Bearer [REDACTED]");
  });

  it("redacts Bearer tokens case-insensitively", () => {
    const input = "header: BEARER my-secret-token";
    const result = redactSecrets(input);
    expect(result).not.toContain("my-secret-token");
    expect(result).toContain("[REDACTED]");
  });

  // ── Multiple secrets ───────────────────────────────────────────────

  it("redacts multiple secrets in one message", () => {
    const input =
      "Key sk-proj_1234567890 failed, fallback key-abcdefghij also failed, Bearer tok123";
    const result = redactSecrets(input);
    expect(result).not.toContain("sk-proj_1234567890");
    expect(result).not.toContain("key-abcdefghij");
    expect(result).not.toContain("tok123");
  });

  // ── Truncation ─────────────────────────────────────────────────────

  it("truncates output to 500 characters", () => {
    const input = "A".repeat(600);
    const result = redactSecrets(input);
    expect(result).toHaveLength(500);
  });

  it("redacts before truncating so no partial secret leaks near boundary", () => {
    // Place a secret starting at char 490 — it would span past 500 if not redacted first
    const prefix = "x".repeat(490);
    const secret = "sk-ABCDEFGHIJ1234567890";
    const input = prefix + secret;
    const result = redactSecrets(input);
    // The secret must be fully replaced BEFORE truncation
    expect(result).not.toContain("sk-ABCDEFGHIJ");
    expect(result).toContain("[REDACTED]");
  });

  // ── Passthrough ────────────────────────────────────────────────────

  it("preserves normal text with no secrets", () => {
    const input = "Connection refused to api.openai.com";
    expect(redactSecrets(input)).toBe(input);
  });

  it("handles empty string", () => {
    expect(redactSecrets("")).toBe("");
  });

  // ── Embedded context ───────────────────────────────────────────────

  it("redacts secrets embedded in longer error context", () => {
    const input =
      'OpenAI API error: {"error":{"message":"Incorrect API key provided: sk-proj_XYZABC1234567890.","type":"invalid_request_error"}}';
    const result = redactSecrets(input);
    expect(result).not.toContain("sk-proj_XYZABC1234567890");
    expect(result).toContain("[REDACTED]");
    // Non-secret context is preserved
    expect(result).toContain("OpenAI API error");
    expect(result).toContain("invalid_request_error");
  });
});

