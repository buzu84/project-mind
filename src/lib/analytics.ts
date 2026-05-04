/**
 * Analytics abstraction layer for ProductMind.
 *
 * ALL analytics/tracking MUST go through this module.
 * Never call GA, PostHog, or any provider directly from components.
 *
 * Currently a no-op — no analytics provider is integrated yet.
 * When a provider is added, wire it inside sendToProvider().
 */

import { hasAnalyticsConsent } from "@/lib/consent";

export type AnalyticsEvent = {
  name: string;
  payload?: Record<string, string | number | boolean | null>;
};

/**
 * Track a product event.
 *
 * Only fires if the user has granted analytics consent.
 * Safe to call anywhere — no-ops silently when consent is missing
 * or no provider is configured.
 */
export function trackEvent(
  name: string,
  payload?: AnalyticsEvent["payload"],
): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;

  // Future: forward to analytics provider
  sendToProvider({ name, payload });
}

/**
 * Identify the current user for analytics.
 * Only fires with consent.
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, string | number | boolean | null>,
): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;

  // Future: call provider identify
  void userId;
  void traits;
}

// ─── Provider integration point ───────────────────────────────────
// When adding an analytics provider (e.g. PostHog, Vercel Analytics):
// 1. Install the SDK
// 2. Initialize it here (only after consent check)
// 3. Forward events inside sendToProvider
// ──────────────────────────────────────────────────────────────────

function sendToProvider(_event: AnalyticsEvent): void {
  // No-op — no provider configured yet.
  // Example future implementation:
  //   posthog.capture(event.name, event.payload ?? {});
}

