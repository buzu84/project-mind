import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isRealAI } from "../is-real-ai";

// ── Env isolation ───────────────────────────────────────────────────

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
});

afterEach(() => {
  process.env = savedEnv;
});

function setEnv(overrides: Record<string, string | undefined>) {
  for (const [key, val] of Object.entries(overrides)) {
    if (val === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }
}

// ── isRealAI ────────────────────────────────────────────────────────

describe("isRealAI", () => {
  it("returns true in production regardless of USE_REAL_AI", () => {
    setEnv({
      NODE_ENV: "production",
      USE_REAL_AI: "false",
      OPENAI_API_KEY: undefined,
    });
    expect(isRealAI()).toBe(true);
  });

  it("returns false when USE_REAL_AI=false in non-production", () => {
    setEnv({
      NODE_ENV: "development",
      USE_REAL_AI: "false",
      OPENAI_API_KEY: "sk-test",
    });
    expect(isRealAI()).toBe(false);
  });

  it("returns true when USE_REAL_AI=true in non-production", () => {
    setEnv({
      NODE_ENV: "development",
      USE_REAL_AI: "true",
      OPENAI_API_KEY: undefined,
    });
    expect(isRealAI()).toBe(true);
  });

  it("returns true when USE_REAL_AI is unset and OPENAI_API_KEY exists", () => {
    setEnv({
      NODE_ENV: "development",
      USE_REAL_AI: undefined,
      OPENAI_API_KEY: "sk-test-key",
    });
    expect(isRealAI()).toBe(true);
  });

  it("returns false when USE_REAL_AI is unset and OPENAI_API_KEY is absent", () => {
    setEnv({
      NODE_ENV: "development",
      USE_REAL_AI: undefined,
      OPENAI_API_KEY: undefined,
    });
    expect(isRealAI()).toBe(false);
  });

  it("returns true in test NODE_ENV when USE_REAL_AI is unset and OPENAI_API_KEY exists", () => {
    setEnv({
      NODE_ENV: "test",
      USE_REAL_AI: undefined,
      OPENAI_API_KEY: "sk-test-key",
    });
    expect(isRealAI()).toBe(true);
  });
});

