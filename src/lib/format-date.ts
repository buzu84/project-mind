/**
 * Deterministic date formatting utilities.
 *
 * These use explicit locale ("en-US") and timeZone ("UTC") so that
 * server-rendered HTML always matches client hydration output.
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

/** e.g. "May 20, 2026" */
export function formatDate(date: string | Date): string {
  return DATE_FMT.format(new Date(date));
}

/** e.g. "May 20, 2026, 12:49 PM" */
export function formatDateTime(date: string | Date): string {
  return DATETIME_FMT.format(new Date(date));
}

/** e.g. "12:49 PM" */
export function formatTime(date: string | Date): string {
  return TIME_FMT.format(new Date(date));
}

/** ISO string for <time dateTime> attribute */
export function toISOString(date: string | Date): string {
  return new Date(date).toISOString();
}

