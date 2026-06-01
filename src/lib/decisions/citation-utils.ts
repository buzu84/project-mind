/**
 * Citation utilities for decision review.
 *
 * Sanitizes AI-generated citation IDs to prevent hallucinated references.
 */

import type { DecisionReviewOutput } from "./review-schemas";

/**
 * Filter citation IDs in AI output to only valid IDs.
 *
 * Prevents AI from inventing citation IDs that don't exist in the
 * evidence set. Removes invalid IDs from assumptions, options, and risks.
 *
 * @param output - AI-generated decision review output
 * @param validIds - Set of valid citation IDs from evidence retrieval
 * @returns New output with sanitized citation IDs
 */
export function sanitizeCitationIds(
  output: DecisionReviewOutput,
  validIds: Set<string>,
): DecisionReviewOutput {
  const filter = (ids?: string[]) => ids?.filter((id) => validIds.has(id));

  return {
    ...output,
    assumptions: output.assumptions.map((a) => ({
      ...a,
      supportingCitationIds: filter(a.supportingCitationIds),
    })),
    options: output.options.map((o) => ({
      ...o,
      supportingCitationIds: filter(o.supportingCitationIds),
    })),
    risks: output.risks.map((r) => ({
      ...r,
      supportingCitationIds: filter(r.supportingCitationIds),
    })),
  };
}
