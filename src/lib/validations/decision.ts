import { z } from "zod";
import {
  DECISION_CATEGORIES,
  DECISION_STATUSES,
} from "@/lib/decisions/constants";

// ── Shared constants ────────────────────────────────────────────────
// Used by both client forms and server schemas to keep validation in sync.

export const DECISION_TITLE_MIN = 3;
export const DECISION_TITLE_MAX = 200;
export const DECISION_PROBLEM_MIN = 10;
export const DECISION_PROBLEM_MAX = 5000;
export const DECISION_CONTEXT_MAX = 5000;

/** Soft threshold — not a blocking rule. Used to show a UX hint when problem statement is present but short. */
export const DECISION_PROBLEM_QUALITY_MIN = 40;

export const DECISION_PROBLEM_QUALITY_HELPER =
  "A clear, specific problem statement helps AI generate more relevant options and assumptions.";

export const DECISION_CONTEXT_QUALITY_HELPER =
  "Adding constraints, prior decisions, or stakeholder context improves AI analysis quality.";

// ── Shared Zod schema ───────────────────────────────────────────────
// Authoritative validation rules for create and update.
// Client-side validation should mirror these rules for UX;
// server-side validation enforces them as the safety boundary.

export const decisionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(DECISION_TITLE_MIN, `Title must be at least ${DECISION_TITLE_MIN} characters.`)
    .max(DECISION_TITLE_MAX, `Title must be under ${DECISION_TITLE_MAX} characters.`),
  category: z.enum(DECISION_CATEGORIES).default("other"),
  status: z.enum(DECISION_STATUSES).default("draft"),
  problem_statement: z
    .string()
    .trim()
    .min(DECISION_PROBLEM_MIN, `Problem statement must be at least ${DECISION_PROBLEM_MIN} characters.`)
    .max(DECISION_PROBLEM_MAX, `Problem statement must be under ${DECISION_PROBLEM_MAX.toLocaleString()} characters.`),
  context_summary: z
    .string()
    .trim()
    .max(DECISION_CONTEXT_MAX, `Context must be under ${DECISION_CONTEXT_MAX.toLocaleString()} characters.`)
    .nullable()
    .optional()
    .transform((v) => v || null),
  confidence_score: z.number().min(0).max(100).nullable().optional(),
  selected_option_id: z.string().uuid().nullable().optional(),
});

export type DecisionFormData = z.infer<typeof decisionSchema>;

