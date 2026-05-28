import { z } from "zod";

// ── Shared constants ────────────────────────────────────────────────
// Used by both client forms and server actions to keep validation in sync.

export const FEEDBACK_TITLE_MIN = 3;
export const FEEDBACK_TITLE_MAX = 200;
export const FEEDBACK_CONTENT_MIN = 20;
export const FEEDBACK_CONTENT_MAX = 50_000;

export const FEEDBACK_CONTENT_QUALITY_HELPER =
  "More detailed feedback produces better AI insights and recommendations.";

export const VALID_SOURCES = [
  "customer_interview",
  "support_ticket",
  "app_review",
  "sales_call",
  "internal_note",
] as const;

export type FeedbackSource = (typeof VALID_SOURCES)[number];

// ── Shared Zod schema ───────────────────────────────────────────────
// Authoritative validation rules for create and update.
// Client-side validation should mirror these rules for UX;
// server-side validation enforces them as the safety boundary.

export const feedbackSchema = z.object({
  title: z
    .string()
    .trim()
    .min(FEEDBACK_TITLE_MIN, `Title must be at least ${FEEDBACK_TITLE_MIN} characters.`)
    .max(FEEDBACK_TITLE_MAX, `Title must be under ${FEEDBACK_TITLE_MAX} characters.`),
  content: z
    .string()
    .trim()
    .min(FEEDBACK_CONTENT_MIN, `Content must be at least ${FEEDBACK_CONTENT_MIN} characters.`)
    .max(FEEDBACK_CONTENT_MAX, `Content must be under ${FEEDBACK_CONTENT_MAX.toLocaleString()} characters.`),
  source: z
    .enum(VALID_SOURCES)
    .optional()
    .transform((v) => v || null),
});

export type FeedbackFormData = z.infer<typeof feedbackSchema>;

