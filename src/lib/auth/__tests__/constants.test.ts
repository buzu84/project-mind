import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isDevMode, isMockDb, DEV_USER } from "../constants";

// ── Env isolation ───────────────────────────────────────────────────
//
// isDevMode and isMockDb read process.env at call time (not module load),
// so a top-level import is safe. We just need to save/restore env vars.

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
});

afterEach(() => {
  process.env = savedEnv;
});

/** Set env vars for a test, handling undefined as delete. */
function setEnv(overrides: Record<string, string | undefined>) {
  for (const [key, val] of Object.entries(overrides)) {
    if (val === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }
}

// ── isDevMode ───────────────────────────────────────────────────────

describe("isDevMode", () => {
  it("returns false in production even if NEXT_PUBLIC_USE_MOCK_AUTH is true", () => {
    setEnv({ NODE_ENV: "production", NEXT_PUBLIC_USE_MOCK_AUTH: "true" });
    expect(isDevMode()).toBe(false);
  });

  it("returns false in test NODE_ENV even if mock auth env is true", () => {
    setEnv({ NODE_ENV: "test", NEXT_PUBLIC_USE_MOCK_AUTH: "true" });
    expect(isDevMode()).toBe(false);
  });

  it("returns false in development without mock auth env vars", () => {
    setEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_USE_MOCK_AUTH: undefined,
      USE_MOCK_AUTH: undefined,
    });
    expect(isDevMode()).toBe(false);
  });

  it("returns true in development with NEXT_PUBLIC_USE_MOCK_AUTH=true", () => {
    setEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_USE_MOCK_AUTH: "true",
      USE_MOCK_AUTH: undefined,
    });
    expect(isDevMode()).toBe(true);
  });

  it("returns true in development with USE_MOCK_AUTH=true as fallback", () => {
    setEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_USE_MOCK_AUTH: undefined,
      USE_MOCK_AUTH: "true",
    });
    expect(isDevMode()).toBe(true);
  });

  it("returns false in development when mock auth is explicitly 'false'", () => {
    setEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_USE_MOCK_AUTH: "false",
      USE_MOCK_AUTH: undefined,
    });
    expect(isDevMode()).toBe(false);
  });

  it("prefers NEXT_PUBLIC_USE_MOCK_AUTH over USE_MOCK_AUTH", () => {
    setEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_USE_MOCK_AUTH: "false",
      USE_MOCK_AUTH: "true",
    });
    // ?? operator means NEXT_PUBLIC_ wins when it is defined (even if "false")
    expect(isDevMode()).toBe(false);
  });
});

// ── isMockDb ────────────────────────────────────────────────────────

describe("isMockDb", () => {
  it("returns false in production even if USE_MOCK_DB is true", () => {
    setEnv({ NODE_ENV: "production", USE_MOCK_DB: "true" });
    expect(isMockDb()).toBe(false);
  });

  it("returns false in test NODE_ENV even if USE_MOCK_DB is true", () => {
    setEnv({ NODE_ENV: "test", USE_MOCK_DB: "true" });
    expect(isMockDb()).toBe(false);
  });

  it("returns false in development without USE_MOCK_DB", () => {
    setEnv({ NODE_ENV: "development", USE_MOCK_DB: undefined });
    expect(isMockDb()).toBe(false);
  });

  it("returns true in development with USE_MOCK_DB=true", () => {
    setEnv({ NODE_ENV: "development", USE_MOCK_DB: "true" });
    expect(isMockDb()).toBe(true);
  });

  it("returns false in development when USE_MOCK_DB is explicitly 'false'", () => {
    setEnv({ NODE_ENV: "development", USE_MOCK_DB: "false" });
    expect(isMockDb()).toBe(false);
  });
});

// ── DEV_USER ────────────────────────────────────────────────────────

describe("DEV_USER", () => {
  it("has the expected shape with a valid UUID and email", () => {
    expect(DEV_USER.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(DEV_USER.email).toContain("@");
    expect(typeof DEV_USER.name).toBe("string");
    expect(DEV_USER.name.length).toBeGreaterThan(0);
  });
});

