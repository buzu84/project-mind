/**
 * Centralized site URL helper.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL (set explicitly in env)
 * 2. NEXT_PUBLIC_VERCEL_URL (auto-set by Vercel for preview deployments)
 * 3. localhost fallback (development only)
 */
export function getSiteUrl(): string {
  // Explicit override always wins
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }

  // Vercel preview deployments — strip any accidental protocol prefix and
  // trailing slashes so the result is always a clean https:// URL.
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    const bare = process.env.NEXT_PUBLIC_VERCEL_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${bare}`;
  }

  // Local development fallback
  return "http://localhost:3000";
}

/**
 * For client-side code: prefer window.location.origin (always correct for
 * the current browser), but fall back to getSiteUrl() for SSR/prerender.
 */
export function getClientSiteUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getSiteUrl();
}
