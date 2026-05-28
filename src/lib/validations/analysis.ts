import { z } from "zod";

// ── Shared constants ────────────────────────────────────────────────

export const ANALYSIS_PRODUCT_NAME_MIN = 2;
export const ANALYSIS_PRODUCT_NAME_MAX = 100;
export const ANALYSIS_INDUSTRY_MIN = 2;
export const ANALYSIS_INDUSTRY_MAX = 200;
export const ANALYSIS_COMPETITORS_MAX = 1000;

export const ANALYSIS_COMPETITORS_HELPER =
  "Listing known competitors helps the AI produce a more grounded analysis.";

// ── Shared Zod schema ───────────────────────────────────────────────

export const analysisSchema = z.object({
  projectId: z.string().min(1),
  productName: z
    .string()
    .trim()
    .min(ANALYSIS_PRODUCT_NAME_MIN, `Product name must be at least ${ANALYSIS_PRODUCT_NAME_MIN} characters.`)
    .max(ANALYSIS_PRODUCT_NAME_MAX, `Product name must be under ${ANALYSIS_PRODUCT_NAME_MAX} characters.`),
  industry: z
    .string()
    .trim()
    .min(ANALYSIS_INDUSTRY_MIN, `Industry must be at least ${ANALYSIS_INDUSTRY_MIN} characters.`)
    .max(ANALYSIS_INDUSTRY_MAX, `Industry must be under ${ANALYSIS_INDUSTRY_MAX} characters.`),
  competitors: z
    .string()
    .trim()
    .max(ANALYSIS_COMPETITORS_MAX, `Competitors must be under ${ANALYSIS_COMPETITORS_MAX} characters.`)
    .optional(),
});

export type AnalysisFormData = z.infer<typeof analysisSchema>;

