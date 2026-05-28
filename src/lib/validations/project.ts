import { z } from "zod";

// ── Shared constants ────────────────────────────────────────────────
// Used by both client forms and server actions to keep validation in sync.

export const PROJECT_NAME_MIN = 2;
export const PROJECT_NAME_MAX = 100;
export const PROJECT_DESC_MAX = 2000;
export const PROJECT_TARGET_USERS_MAX = 500;
export const PROJECT_MARKET_MAX = 200;
export const PROJECT_BUSINESS_MODEL_MAX = 200;
export const PROJECT_GOALS_MAX = 1000;

/** Soft threshold — not a blocking rule. Used to show a UX hint when description is present but short. */
export const PROJECT_DESC_QUALITY_MIN = 20;

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(PROJECT_NAME_MIN, `Project name must be at least ${PROJECT_NAME_MIN} characters.`)
    .max(PROJECT_NAME_MAX, `Name must be under ${PROJECT_NAME_MAX} characters.`),
  description: z
    .string()
    .max(PROJECT_DESC_MAX, `Description must be under ${PROJECT_DESC_MAX.toLocaleString()} characters.`)
    .optional()
    .transform((v) => v || undefined),
  target_users: z
    .string()
    .max(PROJECT_TARGET_USERS_MAX, `Target users must be under ${PROJECT_TARGET_USERS_MAX} characters.`)
    .optional()
    .transform((v) => v || undefined),
  market: z
    .string()
    .max(PROJECT_MARKET_MAX, `Market must be under ${PROJECT_MARKET_MAX} characters.`)
    .optional()
    .transform((v) => v || undefined),
  business_model: z
    .string()
    .max(PROJECT_BUSINESS_MODEL_MAX, `Business model must be under ${PROJECT_BUSINESS_MODEL_MAX} characters.`)
    .optional()
    .transform((v) => v || undefined),
  goals: z
    .string()
    .max(PROJECT_GOALS_MAX, `Goals must be under ${PROJECT_GOALS_MAX.toLocaleString()} characters.`)
    .optional()
    .transform((v) => v || undefined),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

export type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  projectId?: string;
  data?: Record<string, unknown>;
};

