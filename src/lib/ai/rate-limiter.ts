/**
 * In-memory sliding-window rate limiter for AI API routes.
 *
 * Limits are per-user (by auth ID). In production on Vercel, each
 * serverless invocation may have its own memory, so this is a
 * best-effort guard — not a hard guarantee. RLS + usage tracking
 * provide the durable safety net.
 *
 * Production upgrade path:
 * - Replace checkRateLimit() internals with Upstash Redis sliding window
 *   (@upstash/ratelimit) or Supabase DB-backed counters.
 * - The external API (checkStandardAILimit / checkHeavyAILimit) stays the same.
 */

import type { AppUser } from "@/lib/auth/constants";

// ── Admin bypass ──────────────────────────────────────────────────

/**
 * Parse ADMIN_EMAILS env var (server-only, no NEXT_PUBLIC_ prefix).
 * Normalized to lowercase, trimmed.
 */
function getAdminEmailsFromEnv(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Check if an authenticated user is an admin.
 * Only trusts email from the server-side AppUser (sourced from Supabase session).
 */
export function isAdminUser(user: AppUser): boolean {
  if (!user.email) return false;
  return getAdminEmailsFromEnv().has(user.email.trim().toLowerCase());
}

// ── Rate limit tiers ──────────────────────────────────────────────

export type RateLimitTier = "admin" | "free";

/** Future-ready: add "pro" tier with higher limits here. */
const TIER_LIMITS = {
  free: {
    standard: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 / hour
    heavy: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 / 15 min
  },
  // pro: { standard: { limit: 100, windowMs: ... }, heavy: { limit: 20, windowMs: ... } },
} as const;

export function getUserTier(user: AppUser): RateLimitTier {
  if (isAdminUser(user)) return "admin";
  return "free";
}

// ── Rate limiter factory ──────────────────────────────────────────

interface WindowEntry {
  timestamps: number[];
}

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export interface RateLimiterOptions {
  /** Injectable time source for testing. Defaults to Date.now */
  now?: () => number;
  /** Injectable admin email provider for testing. Defaults to process.env.ADMIN_EMAILS */
  getAdminEmails?: () => Set<string>;
}

export interface RateLimiter {
  checkStandardAILimit(user: AppUser): RateLimitResult;
  checkHeavyAILimit(user: AppUser): RateLimitResult;
}

/**
 * Create a rate limiter instance with isolated state.
 * Used by tests to create fresh limiters with fake time.
 */
export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const now = options.now ?? (() => Date.now());
  const getAdminEmails = options.getAdminEmails ?? getAdminEmailsFromEnv;

  // Instance-level state
  const store = new Map<string, WindowEntry>();
  let lastCleanup = now();

  function cleanup(windowMs: number) {
    const currentTime = now();
    if (currentTime - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = currentTime;
    const cutoff = currentTime - windowMs;
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }

  function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    cleanup(windowMs);

    const currentTime = now();
    const cutoff = currentTime - windowMs;

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= limit) {
      const oldest = entry.timestamps[0];
      const resetInSeconds = Math.ceil((oldest + windowMs - currentTime) / 1000);
      return { allowed: false, remaining: 0, resetInSeconds };
    }

    entry.timestamps.push(currentTime);
    return {
      allowed: true,
      remaining: limit - entry.timestamps.length,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  function isAdmin(user: AppUser): boolean {
    if (!user.email) return false;
    return getAdminEmails().has(user.email.trim().toLowerCase());
  }

  function logRateLimitDecision(
    feature: "standard" | "heavy",
    user: AppUser,
    isAdminBypass: boolean,
    result: RateLimitResult,
  ) {
    // Never log in test; avoid noise in dev unless DEBUG is set
    if (process.env.NODE_ENV === "test") return;
    const info = {
      email: user.email ?? "(no email)",
      userId: user.id,
      feature,
      isAdminBypass,
      allowed: result.allowed,
      remaining: result.remaining,
      resetInSeconds: result.resetInSeconds,
    };
    if (!result.allowed) {
      console.warn("[rate-limit] BLOCKED", info);
    } else if (process.env.DEBUG) {
      console.log("[rate-limit] allowed", info);
    }
  }

  return {
    checkStandardAILimit(user: AppUser): RateLimitResult {
      const admin = isAdmin(user);
      // Return fresh object for admin to prevent mutation
      const result = admin
        ? { allowed: true, remaining: 999, resetInSeconds: 0 }
        : checkRateLimit(
            `ai:${user.id}`,
            TIER_LIMITS.free.standard.limit,
            TIER_LIMITS.free.standard.windowMs,
          );
      logRateLimitDecision("standard", user, admin, result);
      return result;
    },

    checkHeavyAILimit(user: AppUser): RateLimitResult {
      const admin = isAdmin(user);
      // Return fresh object for admin to prevent mutation
      const result = admin
        ? { allowed: true, remaining: 999, resetInSeconds: 0 }
        : checkRateLimit(
            `ai-heavy:${user.id}`,
            TIER_LIMITS.free.heavy.limit,
            TIER_LIMITS.free.heavy.windowMs,
          );
      logRateLimitDecision("heavy", user, admin, result);
      return result;
    },
  };
}

// ── Default singleton for existing routes ────────────────────────

const defaultRateLimiter = createRateLimiter();

/** Standard AI limit: 20 requests/hour (free), unlimited (admin) */
export function checkStandardAILimit(user: AppUser): RateLimitResult {
  return defaultRateLimiter.checkStandardAILimit(user);
}

/** Heavy AI limit: 5 requests/15 min (free), unlimited (admin) */
export function checkHeavyAILimit(user: AppUser): RateLimitResult {
  return defaultRateLimiter.checkHeavyAILimit(user);
}

// ── Response helpers ──────────────────────────────────────────────

/** Build a 429 JSON response */
export function rateLimitResponse(result: RateLimitResult) {
  return new Response(JSON.stringify({ error: "Rate limit reached. Please try again later." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(result.resetInSeconds),
      "X-RateLimit-Remaining": "0",
    },
  });
}
