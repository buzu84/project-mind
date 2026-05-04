/**
 * Runtime environment validation.
 * Validates on first invocation only — safe to call from layout.
 */

const isProduction = process.env.NODE_ENV === "production";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[ENV] Missing required environment variable: ${name}`);
  }
  return value;
}

let _validated = false;

/** Validate all required env vars at startup (server-side only). */
export function validateEnv() {
  if (_validated) return;
  _validated = true;

  // During `next build`, static pages are generated with NODE_ENV=production
  // but the runtime env vars (SITE_URL etc.) may point to localhost.
  // Skip strict production guards at build time.
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.__NEXT_PRIVATE_PREBUNDLED_REACT != null;

  // Required always
  requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!anonKey) {
    throw new Error(
      "[ENV] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) {
    throw new Error(
      "[ENV] Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY",
    );
  }

  requireEnv("OPENAI_API_KEY");
  requireEnv("NEXT_PUBLIC_SITE_URL");

  // Production-only guards — skip at build time
  if (isProduction && !isBuildPhase) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    if (siteUrl.includes("localhost") || siteUrl.includes("127.0.0.1")) {
      throw new Error(
        "[ENV] NEXT_PUBLIC_SITE_URL cannot be localhost in production. Set it to your production URL.",
      );
    }

    if (process.env.USE_MOCK_AUTH === "true" || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true") {
      throw new Error("[ENV] Mock auth is not allowed in production.");
    }

    if (process.env.USE_MOCK_DB === "true") {
      throw new Error("[ENV] Mock DB is not allowed in production.");
    }

    if (process.env.USE_REAL_AI === "false") {
      throw new Error("[ENV] USE_REAL_AI=false is not allowed in production.");
    }
  }
}
