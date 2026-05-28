import { z } from "zod";

// ── Shared constants ────────────────────────────────────────────────
// Used by both client forms and server actions to keep validation in sync.

export const FEATURE_NAME_MIN = 3;
export const FEATURE_NAME_MAX = 200;
export const FEATURE_DESC_MIN = 20;
export const FEATURE_DESC_MAX = 2000;

export const FEATURE_DESC_QUALITY_HELPER =
  "Describe the feature in at least one sentence so AI can score it accurately.";

// ── Shared Zod schema ───────────────────────────────────────────────

export const featureSchema = z.object({
  name: z
    .string()
    .trim()
    .min(FEATURE_NAME_MIN, `Feature name must be at least ${FEATURE_NAME_MIN} characters.`)
    .max(FEATURE_NAME_MAX, `Feature name must be under ${FEATURE_NAME_MAX} characters.`),
  description: z
    .string()
    .trim()
    .min(FEATURE_DESC_MIN, FEATURE_DESC_QUALITY_HELPER)
    .max(FEATURE_DESC_MAX, `Description must be under ${FEATURE_DESC_MAX.toLocaleString()} characters.`),
});

export type FeatureFormData = z.infer<typeof featureSchema>;

