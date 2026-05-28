import { z } from "zod";

// ── Shared constants ────────────────────────────────────────────────

export const MULTI_AGENT_QUESTION_MIN = 10;
export const MULTI_AGENT_QUESTION_MAX = 3000;

export const MULTI_AGENT_QUESTION_QUALITY_HELPER =
  "More specific questions produce better multi-perspective reviews.";

// ── Shared Zod schema ───────────────────────────────────────────────

export const multiAgentSchema = z.object({
  projectId: z.string().min(1),
  question: z
    .string()
    .trim()
    .min(MULTI_AGENT_QUESTION_MIN, `Question must be at least ${MULTI_AGENT_QUESTION_MIN} characters.`)
    .max(MULTI_AGENT_QUESTION_MAX, `Question must be under ${MULTI_AGENT_QUESTION_MAX} characters.`),
  inputType: z.enum(["product_question", "feature_idea"]),
  includeContext: z.boolean().optional().default(true),
  includeRag: z.boolean().optional().default(true),
  includeInsights: z.boolean().optional().default(true),
});

export type MultiAgentFormData = z.infer<typeof multiAgentSchema>;

