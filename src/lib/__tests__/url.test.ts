import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSiteUrl, getClientSiteUrl } from "../url";

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

// ── getSiteUrl ──────────────────────────────────────────────────────

describe("getSiteUrl", () => {
  it("returns NEXT_PUBLIC_SITE_URL when set", () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: "https://productmind.app",
      NEXT_PUBLIC_VERCEL_URL: undefined,
    });
    expect(getSiteUrl()).toBe("https://productmind.app");
  });

  it("strips trailing slashes from NEXT_PUBLIC_SITE_URL", () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: "https://productmind.app///",
      NEXT_PUBLIC_VERCEL_URL: undefined,
    });
    expect(getSiteUrl()).toBe("https://productmind.app");
  });

  it("prefers NEXT_PUBLIC_SITE_URL over NEXT_PUBLIC_VERCEL_URL", () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: "https://productmind.app",
      NEXT_PUBLIC_VERCEL_URL: "my-app-abc123.vercel.app",
    });
    expect(getSiteUrl()).toBe("https://productmind.app");
  });

  it("returns https:// prefixed NEXT_PUBLIC_VERCEL_URL when SITE_URL is absent", () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: undefined,
      NEXT_PUBLIC_VERCEL_URL: "my-app-abc123.vercel.app",
    });
    expect(getSiteUrl()).toBe("https://my-app-abc123.vercel.app");
  });

  it("falls back to http://localhost:3000 when both env vars are absent", () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: undefined,
      NEXT_PUBLIC_VERCEL_URL: undefined,
    });
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("treats empty string NEXT_PUBLIC_SITE_URL as absent and falls through", () => {
    // Realistic misconfiguration: NEXT_PUBLIC_SITE_URL= in .env with no value
    setEnv({
      NEXT_PUBLIC_SITE_URL: "",
      NEXT_PUBLIC_VERCEL_URL: "preview.vercel.app",
    });
    expect(getSiteUrl()).toBe("https://preview.vercel.app");
  });
});

// ── getClientSiteUrl ────────────────────────────────────────────────

describe("getClientSiteUrl", () => {
  it("falls back to getSiteUrl in Node/SSR where window is undefined", () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: "https://productmind.app",
      NEXT_PUBLIC_VERCEL_URL: undefined,
    });
    // In Node test environment, typeof window === "undefined"
    expect(getClientSiteUrl()).toBe("https://productmind.app");
  });
});

