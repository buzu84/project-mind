/**
 * Cookie consent system for ProductMind.
 *
 * Currently only essential cookies are used, so no banner is shown.
 * This module prepares the foundation for future analytics/marketing consent.
 */

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  version: string;
  updatedAt: string;
}

const CONSENT_KEY = "cookie_consent_v1";
const CONSENT_VERSION = "1";

const DEFAULT_CONSENT: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  version: CONSENT_VERSION,
  updatedAt: "",
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Read stored consent. Returns default (all optional = false) if none saved. */
export function getCookieConsent(): CookieConsent {
  if (!isBrowser()) return { ...DEFAULT_CONSENT };

  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return { ...DEFAULT_CONSENT };
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "necessary" in parsed &&
      "analytics" in parsed &&
      "marketing" in parsed &&
      "version" in parsed
    ) {
      return parsed as CookieConsent;
    }
  } catch {
    // corrupted — return defaults
  }
  return { ...DEFAULT_CONSENT };
}

/** Persist consent choice. */
export function setCookieConsent(
  consent: Pick<CookieConsent, "analytics" | "marketing">,
): CookieConsent {
  const value: CookieConsent = {
    necessary: true,
    analytics: consent.analytics,
    marketing: consent.marketing,
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
  };

  if (isBrowser()) {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  }

  return value;
}

/** Check if the user has granted analytics consent. */
export function hasAnalyticsConsent(): boolean {
  return getCookieConsent().analytics;
}

/** Check if the user has granted marketing consent. */
export function hasMarketingConsent(): boolean {
  return getCookieConsent().marketing;
}

/** Whether the user has ever explicitly saved a consent choice. */
export function hasExplicitConsent(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(CONSENT_KEY) !== null;
}

/** Reset consent to defaults (e.g. on account deletion). */
export function clearCookieConsent(): void {
  if (isBrowser()) {
    localStorage.removeItem(CONSENT_KEY);
  }
}

