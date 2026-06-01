import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isAdminUser,
  getUserTier,
  checkStandardAILimit,
  checkHeavyAILimit,
  rateLimitResponse,
  _resetRateLimiterForTesting,
  type RateLimitResult,
} from "../rate-limiter";
import type { AppUser } from "@/lib/auth/constants";

// ── Test fixtures ───────────────────────────────────────────────────

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    avatar_url: null,
    ...overrides,
  };
}

// ── Test setup ──────────────────────────────────────────────────────

let originalAdminEmails: string | undefined;

beforeEach(() => {
  // Fixed fake time for deterministic tests
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

  // Reset module-level state
  _resetRateLimiterForTesting();

  // Save and clear env
  originalAdminEmails = process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS;
});

afterEach(() => {
  // Restore env
  if (originalAdminEmails !== undefined) {
    process.env.ADMIN_EMAILS = originalAdminEmails;
  } else {
    delete process.env.ADMIN_EMAILS;
  }

  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── isAdminUser ─────────────────────────────────────────────────────

describe("isAdminUser", () => {
  it("returns true for email matching ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const user = makeUser({ email: "admin@example.com" });

    expect(isAdminUser(user)).toBe(true);
  });

  it("returns false for email not in ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const user = makeUser({ email: "user@example.com" });

    expect(isAdminUser(user)).toBe(false);
  });

  it("is case-insensitive", () => {
    process.env.ADMIN_EMAILS = "Admin@Example.Com";
    const user = makeUser({ email: "admin@example.com" });

    expect(isAdminUser(user)).toBe(true);
  });

  it("returns false when user has no email", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const user = makeUser({ email: "" });

    expect(isAdminUser(user)).toBe(false);
  });

  it("handles comma-separated ADMIN_EMAILS with whitespace", () => {
    process.env.ADMIN_EMAILS = " admin1@example.com , admin2@example.com ";
    const user1 = makeUser({ email: "admin1@example.com" });
    const user2 = makeUser({ email: "admin2@example.com" });
    const user3 = makeUser({ email: "user@example.com" });

    expect(isAdminUser(user1)).toBe(true);
    expect(isAdminUser(user2)).toBe(true);
    expect(isAdminUser(user3)).toBe(false);
  });

  it("returns false when ADMIN_EMAILS is empty", () => {
    process.env.ADMIN_EMAILS = "";
    const user = makeUser({ email: "admin@example.com" });

    expect(isAdminUser(user)).toBe(false);
  });

  it("returns false when ADMIN_EMAILS is not set", () => {
    delete process.env.ADMIN_EMAILS;
    const user = makeUser({ email: "admin@example.com" });

    expect(isAdminUser(user)).toBe(false);
  });
});

// ── getUserTier ─────────────────────────────────────────────────────

describe("getUserTier", () => {
  it("returns 'admin' for admin user", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const user = makeUser({ email: "admin@example.com" });

    expect(getUserTier(user)).toBe("admin");
  });

  it("returns 'free' for regular user", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const user = makeUser({ email: "user@example.com" });

    expect(getUserTier(user)).toBe("free");
  });
});

// ── Admin bypass ────────────────────────────────────────────────────

describe("admin bypass", () => {
  it("checkStandardAILimit returns unlimited for admin", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const admin = makeUser({ email: "admin@example.com" });

    const result = checkStandardAILimit(admin);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(100); // Essentially unlimited
    expect(result.resetInSeconds).toBe(0);
  });

  it("checkHeavyAILimit returns unlimited for admin", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const admin = makeUser({ email: "admin@example.com" });

    const result = checkHeavyAILimit(admin);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(100); // Essentially unlimited
    expect(result.resetInSeconds).toBe(0);
  });

  it("admin bypass does not affect non-admin limits", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const admin = makeUser({ email: "admin@example.com" });
    const user = makeUser({ id: "user-456", email: "user@example.com" });

    // Admin makes many requests
    for (let i = 0; i < 50; i++) {
      checkStandardAILimit(admin);
    }

    // Regular user should still have fresh limit
    const result = checkStandardAILimit(user);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19); // 20 - 1
  });
});

// ── Standard AI limit ───────────────────────────────────────────────

describe("checkStandardAILimit", () => {
  it("allows first request", () => {
    const user = makeUser();

    const result = checkStandardAILimit(user);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19); // 20 - 1
  });

  it("remaining count decreases with each request", () => {
    const user = makeUser();

    const result1 = checkStandardAILimit(user);
    const result2 = checkStandardAILimit(user);
    const result3 = checkStandardAILimit(user);

    expect(result1.remaining).toBe(19);
    expect(result2.remaining).toBe(18);
    expect(result3.remaining).toBe(17);
  });

  it("blocks after free tier limit is exceeded", () => {
    const user = makeUser();

    // Make 20 requests (free tier limit)
    for (let i = 0; i < 20; i++) {
      const result = checkStandardAILimit(user);
      expect(result.allowed).toBe(true);
    }

    // 21st request should be blocked
    const blocked = checkStandardAILimit(user);

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resetInSeconds is positive when blocked", () => {
    const user = makeUser();

    // Exhaust limit
    for (let i = 0; i < 20; i++) {
      checkStandardAILimit(user);
    }

    const blocked = checkStandardAILimit(user);

    expect(blocked.resetInSeconds).toBeGreaterThan(0);
    // Free tier window is 1 hour = 3600 seconds
    expect(blocked.resetInSeconds).toBeLessThanOrEqual(3600);
  });

  it("allows requests again after window elapses", () => {
    const user = makeUser();

    // Exhaust limit
    for (let i = 0; i < 20; i++) {
      checkStandardAILimit(user);
    }

    // Blocked
    const blocked = checkStandardAILimit(user);
    expect(blocked.allowed).toBe(false);

    // Advance time past 1 hour window
    vi.advanceTimersByTime(61 * 60 * 1000); // 61 minutes

    // Should be allowed again
    const allowed = checkStandardAILimit(user);
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(19);
  });

  it("partial window expiry allows some requests", () => {
    const user = makeUser();

    // Make 20 requests over time
    for (let i = 0; i < 20; i++) {
      checkStandardAILimit(user);
      vi.advanceTimersByTime(2 * 60 * 1000); // 2 minutes between each
    }

    // All consumed
    expect(checkStandardAILimit(user).allowed).toBe(false);

    // Advance 30 minutes — first 15 requests (30 min) should expire
    vi.advanceTimersByTime(30 * 60 * 1000);

    // Should have ~15 slots available now (first 15 expired)
    const result = checkStandardAILimit(user);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(10);
  });
});

// ── Heavy AI limit ──────────────────────────────────────────────────

describe("checkHeavyAILimit", () => {
  it("uses heavy limit (5 requests / 15 min)", () => {
    const user = makeUser();

    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      const result = checkHeavyAILimit(user);
      expect(result.allowed).toBe(true);
    }

    // 6th should be blocked
    const blocked = checkHeavyAILimit(user);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("standard and heavy limits are independent", () => {
    const user = makeUser();

    // Exhaust heavy limit
    for (let i = 0; i < 5; i++) {
      checkHeavyAILimit(user);
    }
    expect(checkHeavyAILimit(user).allowed).toBe(false);

    // Standard limit should be unaffected
    const standard = checkStandardAILimit(user);
    expect(standard.allowed).toBe(true);
    expect(standard.remaining).toBe(19);
  });

  it("resets after 15-minute window", () => {
    const user = makeUser();

    // Exhaust heavy limit
    for (let i = 0; i < 5; i++) {
      checkHeavyAILimit(user);
    }
    expect(checkHeavyAILimit(user).allowed).toBe(false);

    // Advance past 15 min window
    vi.advanceTimersByTime(16 * 60 * 1000);

    // Should be allowed again
    const result = checkHeavyAILimit(user);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});

// ── User isolation ──────────────────────────────────────────────────

describe("user isolation", () => {
  it("different users have independent standard limits", () => {
    const user1 = makeUser({ id: "user-1", email: "user1@example.com" });
    const user2 = makeUser({ id: "user-2", email: "user2@example.com" });

    // User 1 exhausts limit
    for (let i = 0; i < 20; i++) {
      checkStandardAILimit(user1);
    }
    expect(checkStandardAILimit(user1).allowed).toBe(false);

    // User 2 should have fresh limit
    const result = checkStandardAILimit(user2);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19);
  });

  it("different users have independent heavy limits", () => {
    const user1 = makeUser({ id: "user-1", email: "user1@example.com" });
    const user2 = makeUser({ id: "user-2", email: "user2@example.com" });

    // User 1 exhausts heavy limit
    for (let i = 0; i < 5; i++) {
      checkHeavyAILimit(user1);
    }
    expect(checkHeavyAILimit(user1).allowed).toBe(false);

    // User 2 should have fresh limit
    const result = checkHeavyAILimit(user2);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});

// ── rateLimitResponse ───────────────────────────────────────────────

describe("rateLimitResponse", () => {
  it("returns status 429", async () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      resetInSeconds: 120,
    };

    const response = rateLimitResponse(result);

    expect(response.status).toBe(429);
  });

  it("includes error message in JSON body", async () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      resetInSeconds: 120,
    };

    const response = rateLimitResponse(result);
    const body = await response.json();

    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  it("Retry-After header matches resetInSeconds", () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      resetInSeconds: 120,
    };

    const response = rateLimitResponse(result);

    expect(response.headers.get("Retry-After")).toBe("120");
  });

  it("includes Content-Type application/json", () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      resetInSeconds: 60,
    };

    const response = rateLimitResponse(result);

    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("X-RateLimit-Remaining is 0", () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      resetInSeconds: 60,
    };

    const response = rateLimitResponse(result);

    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});

