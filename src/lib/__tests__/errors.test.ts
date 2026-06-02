import { describe, it, expect } from "vitest";
import { getFriendlyErrorMessage } from "../errors";

// ── A. Error instances ──────────────────────────────────────────────

describe("getFriendlyErrorMessage — Error instances", () => {
  it("returns AI configuration message for 401 errors", () => {
    const result = getFriendlyErrorMessage(new Error("Request failed with status 401"));
    expect(result).toContain("AI is not configured");
  });

  it("returns AI configuration message for 'Incorrect API key'", () => {
    const result = getFriendlyErrorMessage(new Error("Incorrect API key provided"));
    expect(result).toContain("AI is not configured");
  });

  it("returns AI configuration message for invalid_api_key", () => {
    const result = getFriendlyErrorMessage(new Error("Error code: invalid_api_key"));
    expect(result).toContain("AI is not configured");
  });

  it("returns rate limit message for 429 errors", () => {
    const result = getFriendlyErrorMessage(new Error("Request failed with status 429"));
    expect(result).toContain("rate limit");
  });

  it("returns rate limit message for 'Rate limit' text", () => {
    const result = getFriendlyErrorMessage(new Error("Rate limit exceeded"));
    expect(result).toContain("rate limit");
  });

  it("returns timeout message for 'timeout' errors", () => {
    const result = getFriendlyErrorMessage(new Error("Connection timeout"));
    expect(result).toContain("timed out");
  });

  it("returns timeout message for ETIMEDOUT", () => {
    const result = getFriendlyErrorMessage(new Error("connect ETIMEDOUT 1.2.3.4:443"));
    expect(result).toContain("timed out");
  });

  it("returns sanitized message for generic errors", () => {
    const result = getFriendlyErrorMessage(new Error("Something broke"));
    expect(result).toBe("Something broke");
  });
});

// ── B. Security sanitization ────────────────────────────────────────

describe("getFriendlyErrorMessage — security sanitization", () => {
  it("redacts sk-... API keys from Error messages", () => {
    const secret = "sk-abc123XYZ789_testkey";
    const result = getFriendlyErrorMessage(new Error(`Failed with key ${secret}`));
    expect(result).not.toContain(secret);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts key-... patterns", () => {
    const secret = "key-abc123XYZ789_testkey";
    const result = getFriendlyErrorMessage(new Error(`Auth failed: ${secret}`));
    expect(result).not.toContain(secret);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts Bearer tokens", () => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature";
    const result = getFriendlyErrorMessage(new Error(`Bearer ${token}`));
    expect(result).not.toContain(token);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts Bearer tokens case-insensitively", () => {
    const token = "eyJhbGciOiJIUzI1NiJ9.payload.sig";
    const result = getFriendlyErrorMessage(new Error(`bearer ${token} in header`));
    expect(result).not.toContain(token);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts uppercase BEARER tokens", () => {
    const token = "eyJhbGciOiJIUzI1NiJ9.up.sig";
    const result = getFriendlyErrorMessage(new Error(`BEARER ${token} sent`));
    expect(result).not.toContain(token);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts Bearer token followed by punctuation", () => {
    const token = "tok_abc123def456";
    const result = getFriendlyErrorMessage(new Error(`Bearer ${token}.`));
    expect(result).not.toContain(token);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts multiple secrets in a single message", () => {
    const key1 = "sk-aaaaaaaaaa_bbbbb";
    const key2 = "key-cccccccccc_ddddd";
    const msg = `Keys: ${key1} and ${key2}`;
    const result = getFriendlyErrorMessage(new Error(msg));
    expect(result).not.toContain(key1);
    expect(result).not.toContain(key2);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts secrets from plain string errors", () => {
    const secret = "sk-plainstring_secret1234";
    const result = getFriendlyErrorMessage(`Leaked ${secret} in log`);
    expect(result).not.toContain(secret);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts secrets inside object.message fields", () => {
    const secret = "sk-objectfield_secret1234";
    const result = getFriendlyErrorMessage({ message: `Key: ${secret}` });
    expect(result).not.toContain(secret);
    expect(result).toContain("[REDACTED]");
  });

  it("redacts secrets inside object.error fields", () => {
    const secret = "sk-errorfield_secret5678";
    const result = getFriendlyErrorMessage({ error: `Failure: ${secret}` });
    expect(result).not.toContain(secret);
    expect(result).toContain("[REDACTED]");
  });

  it("does not redact short key-like strings below minimum length", () => {
    const result = getFriendlyErrorMessage(new Error("sk-short"));
    expect(result).toBe("sk-short");
  });
});

// ── C. Friendly message priority ────────────────────────────────────

describe("getFriendlyErrorMessage — friendly message priority", () => {
  it("returns friendly auth message even when error contains a secret", () => {
    const secret = "sk-leaked_secret_key_1234";
    const result = getFriendlyErrorMessage(
      new Error(`401 Unauthorized: ${secret}`),
    );
    expect(result).toContain("AI is not configured");
    expect(result).not.toContain(secret);
  });

  it("returns friendly rate-limit message even when error contains a secret", () => {
    const secret = "sk-ratelimit_secret_key_1234";
    const result = getFriendlyErrorMessage(
      new Error(`429 Too Many Requests for key ${secret}`),
    );
    expect(result).toContain("rate limit");
    expect(result).not.toContain(secret);
  });
});

// ── D. Plain object handling ────────────────────────────────────────

describe("getFriendlyErrorMessage — object inputs", () => {
  it("extracts message field from plain objects", () => {
    const result = getFriendlyErrorMessage({ message: "Custom error" });
    expect(result).toBe("Custom error");
  });

  it("extracts error field from plain objects", () => {
    const result = getFriendlyErrorMessage({ error: "Something failed" });
    expect(result).toBe("Something failed");
  });

  it("prefers message over error field", () => {
    const result = getFriendlyErrorMessage({
      message: "Primary message",
      error: "Secondary error",
    });
    expect(result).toBe("Primary message");
  });

  it("ignores non-string message field and falls through to error field", () => {
    const result = getFriendlyErrorMessage({ message: 42, error: "Fallback error" });
    expect(result).toBe("Fallback error");
  });

  it("returns fallback for non-string message and non-string error", () => {
    const result = getFriendlyErrorMessage({ message: 42, error: true });
    expect(result).toBe("An unexpected error occurred.");
  });

  it("formats Zod-like fieldErrors", () => {
    const result = getFriendlyErrorMessage({
      fieldErrors: {
        email: ["Email is required"],
        name: ["Name too short"],
      },
    });
    expect(result).toContain("email");
    expect(result).toContain("Email is required");
    expect(result).toContain("name");
  });

  it("returns fallback for fieldErrors with all empty arrays", () => {
    const result = getFriendlyErrorMessage({
      fieldErrors: { email: [], name: [] },
    });
    expect(result).toBe("Validation failed.");
  });

  it("skips non-array fieldErrors values without crashing", () => {
    const result = getFriendlyErrorMessage({
      fieldErrors: { email: "not-an-array" as unknown },
    });
    expect(result).toBe("Validation failed.");
  });

  it("does not leak [object Object] for unknown objects", () => {
    const result = getFriendlyErrorMessage({ foo: 123, bar: true });
    expect(result).not.toContain("[object Object]");
    expect(result).toBe("An unexpected error occurred.");
  });
});

// ── E. False-positive / over-redaction review ───────────────────────

describe("getFriendlyErrorMessage — false-positive redaction", () => {
  it("does not redact 'keyboard' (no 'key-' prefix match)", () => {
    const result = getFriendlyErrorMessage(new Error("keyboard shortcut failed"));
    expect(result).toBe("keyboard shortcut failed");
  });

  it("does not redact 'key-value' (below 10-char minimum)", () => {
    const result = getFriendlyErrorMessage(new Error("Missing key-value pair"));
    expect(result).toBe("Missing key-value pair");
  });

  it("does not mangle 'Bearer' alone without a token", () => {
    const result = getFriendlyErrorMessage(new Error("Missing Bearer"));
    // "Bearer" at end of string: \S+ requires at least one non-whitespace after
    // whitespace, so "Bearer" alone at end should not match
    expect(result).toBe("Missing Bearer");
  });
});

// ── F. Truncation ───────────────────────────────────────────────────

describe("getFriendlyErrorMessage — truncation", () => {
  it("truncates Error messages exceeding 500 characters", () => {
    const longMsg = "A".repeat(1000);
    const result = getFriendlyErrorMessage(new Error(longMsg));
    expect(result.length).toBeLessThanOrEqual(500);
  });

  it("truncates string errors exceeding 500 characters", () => {
    const longStr = "B".repeat(1000);
    const result = getFriendlyErrorMessage(longStr);
    expect(result.length).toBeLessThanOrEqual(500);
  });

  it("redacts a secret positioned near the truncation boundary", () => {
    const secret = "sk-boundary_test_secret";
    const padding = "X".repeat(480);
    const msg = `${padding}${secret}`;
    const result = getFriendlyErrorMessage(new Error(msg));
    expect(result).not.toContain(secret);
    expect(result).not.toContain("sk-");
    expect(result).toContain("[REDACTED]");
    expect(result.length).toBeLessThanOrEqual(500);
  });

  it("redacts a long secret that would span the 500-char boundary", () => {
    const secretSuffix = "A".repeat(50);
    const secret = `sk-${secretSuffix}`;
    const padding = "Y".repeat(485);
    const msg = `${padding}${secret}`;
    const result = getFriendlyErrorMessage(new Error(msg));
    expect(result).not.toContain(secret);
    expect(result).not.toContain("sk-A");
    expect(result).toContain("[REDACTED]");
    expect(result.length).toBeLessThanOrEqual(500);
  });
});

// ── G. Edge cases ───────────────────────────────────────────────────

describe("getFriendlyErrorMessage — edge cases", () => {
  it("returns fallback for null", () => {
    const result = getFriendlyErrorMessage(null);
    expect(result).toBe("An unexpected error occurred.");
  });

  it("returns fallback for undefined", () => {
    const result = getFriendlyErrorMessage(undefined);
    expect(result).toBe("An unexpected error occurred.");
  });

  it("handles empty string", () => {
    const result = getFriendlyErrorMessage("");
    expect(result).toBe("");
  });

  it("passes through normal safe message unchanged", () => {
    const result = getFriendlyErrorMessage(new Error("File not found"));
    expect(result).toBe("File not found");
  });

  it("returns fallback for numeric input", () => {
    const result = getFriendlyErrorMessage(42 as unknown);
    expect(result).toBe("An unexpected error occurred.");
  });

  it("returns fallback for boolean input", () => {
    const result = getFriendlyErrorMessage(false as unknown);
    expect(result).toBe("An unexpected error occurred.");
  });
});
