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
function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  if (!raw) return new Set();
  return new Set(
    raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
}

/**
 * Check if an authenticated user is an admin.
 * Only trusts email from the server-side AppUser (sourced from Supabase session).
 */
export function isAdminUser(user: AppUser): boolean {
  if (!user.email) return false;
  return getAdminEmails().has(user.email.trim().toLowerCase());
}

// ── Rate limit tiers ──────────────────────────────────────────────

export type RateLimitTier = "admin" | "free";

/** Future-ready: add "pro" tier with higher limits here. */
const TIER_LIMITS = {
  free: {
    standard: { limit: 20, windowMs: 60 * 60 * 1000 },        // 20 / hour
    heavy:    { limit: 5,  windowMs: 15 * 60 * 1000 },         // 5 / 15 min
  },
  // pro: { standard: { limit: 100, windowMs: ... }, heavy: { limit: 20, windowMs: ... } },
} as const;

export function getUserTier(user: AppUser): RateLimitTier {
  if (isAdminUser(user)) return "admin";
  return "free";
}

// ── In-memory sliding window ──────────────────────────────────────

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

const ALLOWED_UNLIMITED: RateLimitResult = { allowed: true, remaining: 999, resetInSeconds: 0 };

function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const resetInSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    resetInSeconds: Math.ceil(windowMs / 1000),
  };
}

// ── Public API used by all AI routes ──────────────────────────────

/** Standard AI limit: 20 requests/hour (free), unlimited (admin) */
export function checkStandardAILimit(user: AppUser): RateLimitResult {
  if (isAdminUser(user)) return ALLOWED_UNLIMITED;
  const { limit, windowMs } = TIER_LIMITS.free.standard;
  return checkRateLimit(`ai:${user.id}`, limit, windowMs);
}

/** Heavy AI limit: 5 requests/15 min (free), unlimited (admin) */
export function checkHeavyAILimit(user: AppUser): RateLimitResult {
  if (isAdminUser(user)) return ALLOWED_UNLIMITED;
  const { limit, windowMs } = TIER_LIMITS.free.heavy;
  return checkRateLimit(`ai-heavy:${user.id}`, limit, windowMs);
}

/** Build a 429 JSON response */
export function rateLimitResponse(result: RateLimitResult) {
  return new Response(
    JSON.stringify({ error: "Rate limit reached. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.resetInSeconds),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
