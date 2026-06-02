import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Every test that imports env.ts must go through this helper.
 *
 * Why: env.ts captures `isProduction` and `_validated` at module scope.
 * A fresh `vi.resetModules()` + dynamic `import()` is the only way to
 * get a clean module with both flags reset.
 */
async function importValidateEnv(
  overrides: Record<string, string | undefined> = {},
) {
  vi.resetModules();

  // Apply overrides — undefined means delete
  for (const [key, val] of Object.entries(overrides)) {
    if (val === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }

  const mod = await import("@/lib/env");
  return mod;
}

/** Minimal env that satisfies all required vars (non-production). */
const VALID_DEV_ENV: Record<string, string> = {
  NODE_ENV: "test",
  NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-value",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-value",
  OPENAI_API_KEY: "sk-test-key",
  NEXT_PUBLIC_SITE_URL: "https://productmind.app",
};

/** Minimal env that satisfies all required vars in production. */
const VALID_PROD_ENV: Record<string, string> = {
  ...VALID_DEV_ENV,
  NODE_ENV: "production",
};

// Save and restore the full process.env around each test to prevent leaks.
let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
});

afterEach(() => {
  process.env = savedEnv;
});

// ── Happy path ──────────────────────────────────────────────────────

describe("validateEnv — happy path", () => {
  it("passes with all required env vars set (non-production)", async () => {
    const { validateEnv } = await importValidateEnv(VALID_DEV_ENV);
    expect(() => validateEnv()).not.toThrow();
  });

  it("passes with all required env vars set (production)", async () => {
    const { validateEnv } = await importValidateEnv(VALID_PROD_ENV);
    expect(() => validateEnv()).not.toThrow();
  });

  it("accepts NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as anon key fallback", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_DEV_ENV,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key-value",
    });
    expect(() => validateEnv()).not.toThrow();
  });

  it("accepts SUPABASE_SECRET_KEY as service role key fallback", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_DEV_ENV,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      SUPABASE_SECRET_KEY: "secret-key-value",
    });
    expect(() => validateEnv()).not.toThrow();
  });
});

// ── Missing required vars ───────────────────────────────────────────

describe("validateEnv — missing required vars", () => {
  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_DEV_ENV,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
    });
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws when both anon key variants are missing", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_DEV_ENV,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
    });
    expect(() => validateEnv()).toThrow(/ANON_KEY|PUBLISHABLE_KEY/);
  });

  it("throws when both service role key variants are missing", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_DEV_ENV,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      SUPABASE_SECRET_KEY: undefined,
    });
    expect(() => validateEnv()).toThrow(/SERVICE_ROLE_KEY|SECRET_KEY/);
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_DEV_ENV,
      OPENAI_API_KEY: undefined,
    });
    expect(() => validateEnv()).toThrow(/OPENAI_API_KEY/);
  });

  it("throws when NEXT_PUBLIC_SITE_URL is missing", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_DEV_ENV,
      NEXT_PUBLIC_SITE_URL: undefined,
    });
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });
});

// ── Production safety guards ────────────────────────────────────────

describe("validateEnv — production safety guards", () => {
  it("throws when SITE_URL contains localhost in production", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_PROD_ENV,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    });
    expect(() => validateEnv()).toThrow(/localhost/i);
  });

  it("throws when SITE_URL contains 127.0.0.1 in production", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_PROD_ENV,
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
    });
    expect(() => validateEnv()).toThrow(/localhost|127\.0\.0\.1/i);
  });

  it("throws when USE_MOCK_AUTH=true in production", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_PROD_ENV,
      USE_MOCK_AUTH: "true",
    });
    expect(() => validateEnv()).toThrow(/mock auth/i);
  });

  it("throws when NEXT_PUBLIC_USE_MOCK_AUTH=true in production", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_PROD_ENV,
      NEXT_PUBLIC_USE_MOCK_AUTH: "true",
    });
    expect(() => validateEnv()).toThrow(/mock auth/i);
  });

  it("throws when USE_MOCK_DB=true in production", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_PROD_ENV,
      USE_MOCK_DB: "true",
    });
    expect(() => validateEnv()).toThrow(/mock db/i);
  });

  it("throws when USE_REAL_AI=false in production", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_PROD_ENV,
      USE_REAL_AI: "false",
    });
    expect(() => validateEnv()).toThrow(/USE_REAL_AI/);
  });

  it("does not throw production guards in non-production", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_DEV_ENV,
      NODE_ENV: "test",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      USE_MOCK_AUTH: "true",
      USE_MOCK_DB: "true",
      USE_REAL_AI: "false",
    });
    expect(() => validateEnv()).not.toThrow();
  });
});

// ── Build phase exception ───────────────────────────────────────────

describe("validateEnv — build phase exception", () => {
  it("skips production guards when NEXT_PHASE is phase-production-build", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_PROD_ENV,
      NEXT_PHASE: "phase-production-build",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      USE_MOCK_AUTH: "true",
    });
    expect(() => validateEnv()).not.toThrow();
  });

  it("skips production guards when __NEXT_PRIVATE_PREBUNDLED_REACT is set", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_PROD_ENV,
      __NEXT_PRIVATE_PREBUNDLED_REACT: "next",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      USE_MOCK_DB: "true",
    });
    expect(() => validateEnv()).not.toThrow();
  });

  it("still validates required vars during build phase", async () => {
    const { validateEnv } = await importValidateEnv({
      ...VALID_PROD_ENV,
      NEXT_PHASE: "phase-production-build",
      NEXT_PUBLIC_SUPABASE_URL: undefined,
    });
    // Required vars are checked even during build — only prod guards are skipped
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});

// ── Empty string env vars ────────────────────────────────────────────

describe("validateEnv — empty string handling", () => {
  it("treats empty string as missing for required env vars", async () => {
    // Realistic scenario: OPENAI_API_KEY= in .env file
    const { validateEnv } = await importValidateEnv({
      ...VALID_DEV_ENV,
      OPENAI_API_KEY: "",
    });
    expect(() => validateEnv()).toThrow(/OPENAI_API_KEY/);
  });
});

// ── Validation cache ────────────────────────────────────────────────

describe("validateEnv — validation cache", () => {
  it("caches successful validation so second call is a no-op", async () => {
    const { validateEnv } = await importValidateEnv(VALID_DEV_ENV);

    // First call succeeds and sets _validated = true
    expect(() => validateEnv()).not.toThrow();

    // Remove a required var after successful validation
    delete process.env.OPENAI_API_KEY;

    // Second call returns early due to cache — does not re-validate
    expect(() => validateEnv()).not.toThrow();
  });

  it("caches even after failure — second call is still a no-op", async () => {
    // _validated = true is set BEFORE validation logic runs,
    // so a thrown error still caches the "attempted" state.
    const { validateEnv } = await importValidateEnv({
      ...VALID_DEV_ENV,
      OPENAI_API_KEY: undefined,
    });

    // First call throws — but _validated is already true
    expect(() => validateEnv()).toThrow(/OPENAI_API_KEY/);

    // Fix the env var — but second call returns early (cached)
    process.env.OPENAI_API_KEY = "sk-fixed";
    expect(() => validateEnv()).not.toThrow();
  });

  it("fresh import resets the cache", async () => {
    // First import: validate successfully
    const mod1 = await importValidateEnv(VALID_DEV_ENV);
    expect(() => mod1.validateEnv()).not.toThrow();

    // Second fresh import: cache is reset, missing var now throws
    const mod2 = await importValidateEnv({
      ...VALID_DEV_ENV,
      OPENAI_API_KEY: undefined,
    });
    expect(() => mod2.validateEnv()).toThrow(/OPENAI_API_KEY/);
  });
});

