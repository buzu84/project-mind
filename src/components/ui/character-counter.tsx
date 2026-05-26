"use client";

interface CharacterCounterProps {
  current: number;
  max: number;
  /** Fraction (0–1) at which the counter turns amber. Default 0.9 */
  warningThreshold?: number;
}

/**
 * Live character counter with warning/error states.
 * Shows "X / Y" and changes color near the limit.
 * Only announces to screen readers when nearing or at the limit.
 */
export function CharacterCounter({
  current,
  max,
  warningThreshold = 0.9,
}: CharacterCounterProps) {
  const ratio = max > 0 ? current / max : 0;
  const isWarning = ratio >= warningThreshold && ratio < 1;
  const isOver = ratio >= 1;
  const isNearLimit = isWarning || isOver;

  const color = isOver
    ? "text-red-500"
    : isWarning
      ? "text-amber-500"
      : "text-gray-400";

  return (
    <span
      className={`text-xs tabular-nums ${color}`}
      role="status"
      aria-live={isNearLimit ? "polite" : "off"}
      aria-label={`${current} of ${max} characters used`}
    >
      {current.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
    </span>
  );
}

