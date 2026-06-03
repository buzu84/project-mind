import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isAdminUser,
  getUserTier,
  checkStandardAILimit,
  checkHeavyAILimit,
  rateLimitResponse,
  createRateLimiter,
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

// ── Fake time helper ────────────────────────────────────────────────

function createFakeTime(startMs: number = 0) {
  let currentTime = startMs;
  return {
    now: () => currentTime,
    advance: (ms: number) => {
      currentTime += ms;
    },
    set: (ms: number) => {
      currentTime = ms;
    },
  };
}

// ── Env cleanup for singleton tests ────────────────────────────────

let originalAdminEmails: string | undefined;

beforeEach(() => {
  originalAdminEmails = process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_EMAILS;
});

afterEach(() => {
  if (originalAdminEmails !== undefined) {
    process.env.ADMIN_EMAILS = originalAdminEmails;
  } else {
    delete process.env.ADMIN_EMAILS;
  }
});

// ── isAdminUser (public singleton function) ─────────────────────────

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

// ── createRateLimiter factory ───────────────────────────────────────

describe("createRateLimiter with fake time", () => {
  describe("admin bypass", () => {
    it("checkStandardAILimit returns unlimited for admin", () => {
      const time = createFakeTime(1000000);
      const adminEmails = new Set(["admin@example.com"]);
      const limiter = createRateLimiter({ now: time.now, getAdminEmails: () => adminEmails });
      const admin = makeUser({ email: "admin@example.com" });

      const result = limiter.checkStandardAILimit(admin);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(100);
      expect(result.resetInSeconds).toBe(0);
    });

    it("checkHeavyAILimit returns unlimited for admin", () => {
      const time = createFakeTime(1000000);
      const adminEmails = new Set(["admin@example.com"]);
      const limiter = createRateLimiter({ now: time.now, getAdminEmails: () => adminEmails });
      const admin = makeUser({ email: "admin@example.com" });

      const result = limiter.checkHeavyAILimit(admin);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(100);
      expect(result.resetInSeconds).toBe(0);
    });

    it("admin bypass does not consume quota", () => {
      const time = createFakeTime(1000000);
      const adminEmails = new Set(["admin@example.com"]);
      const limiter = createRateLimiter({ now: time.now, getAdminEmails: () => adminEmails });
      const admin = makeUser({ email: "admin@example.com" });

      // Make 50 admin requests
      for (let i = 0; i < 50; i++) {
        const result = limiter.checkStandardAILimit(admin);
        expect(result.allowed).toBe(true);
      }

      // Regular user should have fresh limit (admin didn't consume quota)
      const user = makeUser({ id: "user-456", email: "user@example.com" });
      const result = limiter.checkStandardAILimit(user);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19);
    });

    it("admin result is fresh object (not shared reference)", () => {
      const time = createFakeTime(1000000);
      const adminEmails = new Set(["admin@example.com"]);
      const limiter = createRateLimiter({ now: time.now, getAdminEmails: () => adminEmails });
      const admin = makeUser({ email: "admin@example.com" });

      const result1 = limiter.checkStandardAILimit(admin);
      const result2 = limiter.checkStandardAILimit(admin);

      // Should be different objects to prevent mutation
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  describe("standard AI limit (free tier)", () => {
    it("allows first request", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user = makeUser();

      const result = limiter.checkStandardAILimit(user);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19); // 20 - 1
    });

    it("remaining count decreases with each request", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user = makeUser();

      const result1 = limiter.checkStandardAILimit(user);
      const result2 = limiter.checkStandardAILimit(user);
      const result3 = limiter.checkStandardAILimit(user);

      expect(result1.remaining).toBe(19);
      expect(result2.remaining).toBe(18);
      expect(result3.remaining).toBe(17);
    });

    it("blocks after free tier limit (20) is exceeded", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user = makeUser();

      // Make 20 requests
      for (let i = 0; i < 20; i++) {
        const result = limiter.checkStandardAILimit(user);
        expect(result.allowed).toBe(true);
      }

      // 21st request should be blocked
      const blocked = limiter.checkStandardAILimit(user);

      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("resetInSeconds is positive and decreases as window expires", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user = makeUser();

      // Exhaust limit
      for (let i = 0; i < 20; i++) {
        limiter.checkStandardAILimit(user);
      }

      const blocked1 = limiter.checkStandardAILimit(user);
      expect(blocked1.resetInSeconds).toBeGreaterThan(0);
      expect(blocked1.resetInSeconds).toBeLessThanOrEqual(3600); // 1 hour window

      // Advance 10 minutes
      time.advance(10 * 60 * 1000);

      const blocked2 = limiter.checkStandardAILimit(user);
      expect(blocked2.resetInSeconds).toBeLessThan(blocked1.resetInSeconds);
    });

    it("allows requests again after 1-hour window elapses", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user = makeUser();

      // Exhaust limit
      for (let i = 0; i < 20; i++) {
        limiter.checkStandardAILimit(user);
      }

      // Blocked
      const blocked = limiter.checkStandardAILimit(user);
      expect(blocked.allowed).toBe(false);

      // Advance past 1 hour window
      time.advance(61 * 60 * 1000); // 61 minutes

      // Should be allowed again
      const allowed = limiter.checkStandardAILimit(user);
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBe(19);
    });

    it("sliding window gradually expires old requests", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user = makeUser();

      // Make 20 requests, each 2 minutes apart
      for (let i = 0; i < 20; i++) {
        limiter.checkStandardAILimit(user);
        time.advance(2 * 60 * 1000);
      }
      // Requests at: T0, T0+2min, ..., T0+38min
      // Current time: T0+40min

      // All consumed
      expect(limiter.checkStandardAILimit(user).allowed).toBe(false);

      // Advance 30 more minutes (total T0+70min)
      time.advance(30 * 60 * 1000);

      // Window is 60 min. Cutoff = T0+70 - 60 = T0+10
      // Requests > T0+10 remain: T0+12, T0+14, ..., T0+38 = 14 requests
      // New request makes 15. Remaining = 20 - 15 = 5
      const result = limiter.checkStandardAILimit(user);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });
  });

  describe("heavy AI limit (free tier)", () => {
    it("uses heavy limit (5 requests / 15 min)", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user = makeUser();

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const result = limiter.checkHeavyAILimit(user);
        expect(result.allowed).toBe(true);
      }

      // 6th should be blocked
      const blocked = limiter.checkHeavyAILimit(user);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("standard and heavy limits are independent", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user = makeUser();

      // Exhaust heavy limit
      for (let i = 0; i < 5; i++) {
        limiter.checkHeavyAILimit(user);
      }
      expect(limiter.checkHeavyAILimit(user).allowed).toBe(false);

      // Standard limit should be unaffected
      const standard = limiter.checkStandardAILimit(user);
      expect(standard.allowed).toBe(true);
      expect(standard.remaining).toBe(19);
    });

    it("resets after 15-minute window", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user = makeUser();

      // Exhaust heavy limit
      for (let i = 0; i < 5; i++) {
        limiter.checkHeavyAILimit(user);
      }
      expect(limiter.checkHeavyAILimit(user).allowed).toBe(false);

      // Advance past 15 min window
      time.advance(16 * 60 * 1000);

      // Should be allowed again
      const result = limiter.checkHeavyAILimit(user);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe("user isolation", () => {
    it("different users have independent standard limits", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user1 = makeUser({ id: "user-1", email: "user1@example.com" });
      const user2 = makeUser({ id: "user-2", email: "user2@example.com" });

      // User 1 exhausts limit
      for (let i = 0; i < 20; i++) {
        limiter.checkStandardAILimit(user1);
      }
      expect(limiter.checkStandardAILimit(user1).allowed).toBe(false);

      // User 2 should have fresh limit
      const result = limiter.checkStandardAILimit(user2);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19);
    });

    it("different users have independent heavy limits", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user1 = makeUser({ id: "user-1", email: "user1@example.com" });
      const user2 = makeUser({ id: "user-2", email: "user2@example.com" });

      // User 1 exhausts heavy limit
      for (let i = 0; i < 5; i++) {
        limiter.checkHeavyAILimit(user1);
      }
      expect(limiter.checkHeavyAILimit(user1).allowed).toBe(false);

      // User 2 should have fresh limit
      const result = limiter.checkHeavyAILimit(user2);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe("cleanup behavior", () => {
    it("does not remove active requests prematurely", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user = makeUser();

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        limiter.checkStandardAILimit(user);
      }

      // Advance 30 minutes (still within 60 min window)
      time.advance(30 * 60 * 1000);

      // Should still have 10 requests counted
      const result = limiter.checkStandardAILimit(user);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 20 - 10 - 1 = 9
    });

    it("removes expired requests from different users", () => {
      const time = createFakeTime(1000000);
      const limiter = createRateLimiter({ now: time.now });
      const user1 = makeUser({ id: "user-1" });
      const user2 = makeUser({ id: "user-2" });

      // Both users make requests
      for (let i = 0; i < 10; i++) {
        limiter.checkStandardAILimit(user1);
        limiter.checkStandardAILimit(user2);
      }

      // Advance past window
      time.advance(61 * 60 * 1000);

      // Both should have fresh limits
      expect(limiter.checkStandardAILimit(user1).remaining).toBe(19);
      expect(limiter.checkStandardAILimit(user2).remaining).toBe(19);
    });
  });
});

// ── Default singleton compatibility ─────────────────────────────────

describe("default singleton (checkStandardAILimit, checkHeavyAILimit)", () => {
  it("checkStandardAILimit respects ADMIN_EMAILS env", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const admin = makeUser({ email: "admin@example.com" });

    const result = checkStandardAILimit(admin);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(100);
  });

  it("checkHeavyAILimit respects ADMIN_EMAILS env", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const admin = makeUser({ email: "admin@example.com" });

    const result = checkHeavyAILimit(admin);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(100);
  });

  it("checkStandardAILimit allows regular users", () => {
    const user = makeUser({ email: "user@example.com" });

    const result = checkStandardAILimit(user);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });
});
