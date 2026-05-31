/**
 * Deterministic number formatting utilities.
 *
 * Uses explicit locale ("en-US") so server-rendered HTML matches
 * client hydration output regardless of runtime locale.
 *
 * See docs/architecture/DETERMINISTIC_RENDERING.md
 */

const NUMBER_FMT = new Intl.NumberFormat("en-US");

/** e.g. 12345 → "12,345" */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "0";
  return NUMBER_FMT.format(value);
}

