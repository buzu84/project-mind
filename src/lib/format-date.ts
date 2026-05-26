/**
 * Deterministic date formatting utilities.
 *
 * These use explicit locale ("en-US") and timeZone ("UTC") so that
 * server-rendered HTML always matches client hydration output.
 *
 * See docs/architecture/DETERMINISTIC_RENDERING.md
 */

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const DATETIME_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

function safeDate(date: string | Date | null | undefined): Date | null {
  if (date == null) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** e.g. "May 20, 2026" — returns "—" for invalid/null dates */
export function formatDate(date: string | Date | null | undefined): string {
  const d = safeDate(date);
  return d ? DATE_FMT.format(d) : "—";
}

/** e.g. "May 20, 2026, 12:49 PM" */
export function formatDateTime(date: string | Date | null | undefined): string {
  const d = safeDate(date);
  return d ? DATETIME_FMT.format(d) : "—";
}

/** e.g. "12:49 PM" */
export function formatTime(date: string | Date | null | undefined): string {
  const d = safeDate(date);
  return d ? TIME_FMT.format(d) : "—";
}

/** ISO string for <time dateTime> attribute */
export function toISOString(date: string | Date | null | undefined): string {
  const d = safeDate(date);
  return d ? d.toISOString() : "";
}
