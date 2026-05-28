import { z } from "zod";

// ── Shared constants ────────────────────────────────────────────────

export const CONTEXT_SECTION_MAX = 3000;

export const CONTEXT_QUALITY_HELPER =
  "More detailed context improves all AI-generated recommendations across the project.";

// ── Shared Zod schema ───────────────────────────────────────────────

const optionalSection = z
  .string()
  .trim()
  .max(CONTEXT_SECTION_MAX, `Each section must be under ${CONTEXT_SECTION_MAX} characters.`)
  .optional()
  .transform((v) => v || null);

export const contextSchema = z.object({
  product_overview: optionalSection,
  target_personas: optionalSection,
  current_metrics: optionalSection,
  pain_points: optionalSection,
  competitors: optionalSection,
  strategic_goals: optionalSection,
  constraints: optionalSection,
  open_questions: optionalSection,
});

export type ContextFormData = z.infer<typeof contextSchema>;

