import { z } from "zod";

// ── Shared constants ────────────────────────────────────────────────
// Used by both client form and API route to keep validation in sync.

export const PRD_PRODUCT_NAME_MAX = 100;
export const PRD_DESCRIPTION_MIN = 10;
export const PRD_DESCRIPTION_MAX = 2000;
export const PRD_TARGET_AUDIENCE_MAX = 500;

export const PRD_DESCRIPTION_QUALITY_HELPER =
  "Include goals, user problems, and constraints for a more useful PRD.";

// ── Shared Zod schema ───────────────────────────────────────────────

export const prdSchema = z.object({
  projectId: z.string().min(1),
  productName: z
    .string()
    .trim()
    .min(1, "Product name is required.")
    .max(PRD_PRODUCT_NAME_MAX, `Product name must be under ${PRD_PRODUCT_NAME_MAX} characters.`),
  productDescription: z
    .string()
    .trim()
    .min(PRD_DESCRIPTION_MIN, `Description must be at least ${PRD_DESCRIPTION_MIN} characters.`)
    .max(PRD_DESCRIPTION_MAX, `Description must be under ${PRD_DESCRIPTION_MAX} characters.`),
  targetAudience: z
    .string()
    .trim()
    .max(PRD_TARGET_AUDIENCE_MAX, `Target audience must be under ${PRD_TARGET_AUDIENCE_MAX} characters.`)
    .optional(),
});

export type PrdFormData = z.infer<typeof prdSchema>;

