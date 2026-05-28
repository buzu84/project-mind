"use client";

interface MinLengthHintProps {
  /** Current trimmed character count */
  current: number;
  /** Minimum required characters */
  min: number;
}

/**
 * Shows "X / Y characters minimum" with color that changes
 * from amber (below minimum) to gray (minimum met).
 */
export function MinLengthHint({ current, min }: MinLengthHintProps) {
  const isMet = current >= min;
  return (
    <p className={`text-xs ${isMet ? "text-gray-400" : "text-amber-600"}`}>
      {current} / {min} characters minimum
    </p>
  );
}

