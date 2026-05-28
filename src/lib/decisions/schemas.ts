/**
 * Decision Engine – Zod validation schemas.
 *
 * Every create/update operation must be validated through these schemas
 * before any database write.
 */

import { z } from "zod";
import {
  EFFORT_ESTIMATES,
  REVERSIBILITY_LEVELS,
  ASSUMPTION_TYPES,
  RISK_LEVELS,
  EVIDENCE_STATUSES,
  EVIDENCE_SOURCE_TYPES,
  LINK_TYPES,
  AGENT_ROLES,
} from "./constants";
import { decisionSchema } from "@/lib/validations/decision";

// ── Helpers ─────────────────────────────────────────────────────────

const uuidField = z.string().uuid();
const optionalUuid = z.string().uuid().nullable().optional();
const confidenceScore = z.number().min(0).max(100).nullable().optional();
const relevanceScore = z.number().min(0).max(1).nullable().optional();
const stringArray = z.array(z.string()).default([]);

// ── Decision ────────────────────────────────────────────────────────
// Single source of truth lives in @/lib/validations/decision.ts.

export const createDecisionSchema = decisionSchema;
export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;

export const updateDecisionSchema = createDecisionSchema.partial();
export type UpdateDecisionInput = z.infer<typeof updateDecisionSchema>;

// ── Decision Option ─────────────────────────────────────────────────

export const createDecisionOptionSchema = z.object({
  decision_id: uuidField,
  title: z.string().min(2, "Title must be at least 2 characters.").max(200),
  description: z.string().max(5000).nullable().optional(),
  pros: stringArray,
  cons: stringArray,
  risks: stringArray,
  expected_impact: z.string().max(1000).nullable().optional(),
  effort_estimate: z.enum(EFFORT_ESTIMATES).default("unknown"),
  reversibility: z.enum(REVERSIBILITY_LEVELS).default("unknown"),
  confidence_score: confidenceScore,
});
export type CreateDecisionOptionInput = z.infer<typeof createDecisionOptionSchema>;

export const updateDecisionOptionSchema = createDecisionOptionSchema.omit({ decision_id: true }).partial();
export type UpdateDecisionOptionInput = z.infer<typeof updateDecisionOptionSchema>;

// ── Assumption ──────────────────────────────────────────────────────

export const createAssumptionSchema = z.object({
  decision_id: optionalUuid,
  statement: z.string().min(5, "Statement must be at least 5 characters.").max(2000),
  type: z.enum(ASSUMPTION_TYPES).default("other"),
  risk_level: z.enum(RISK_LEVELS).default("medium"),
  evidence_status: z.enum(EVIDENCE_STATUSES).default("unsupported"),
  validation_method: z.string().max(1000).nullable().optional(),
});
export type CreateAssumptionInput = z.infer<typeof createAssumptionSchema>;

export const updateAssumptionSchema = createAssumptionSchema.partial();
export type UpdateAssumptionInput = z.infer<typeof updateAssumptionSchema>;

// ── Evidence ────────────────────────────────────────────────────────

export const createEvidenceSchema = z.object({
  source_type: z.enum(EVIDENCE_SOURCE_TYPES).default("manual"),
  source_id: optionalUuid,
  title: z.string().max(200).nullable().optional(),
  claim: z.string().min(5, "Claim must be at least 5 characters.").max(3000),
  content: z.string().max(10000).nullable().optional(),
  relevance_score: relevanceScore,
});
export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;

export const updateEvidenceSchema = createEvidenceSchema.partial();
export type UpdateEvidenceInput = z.infer<typeof updateEvidenceSchema>;

// ── Decision–Evidence Link ──────────────────────────────────────────

export const createDecisionEvidenceLinkSchema = z.object({
  decision_id: uuidField,
  evidence_id: uuidField,
  link_type: z.enum(LINK_TYPES).default("informs"),
});
export type CreateDecisionEvidenceLinkInput = z.infer<typeof createDecisionEvidenceLinkSchema>;

// ── Agent Review ────────────────────────────────────────────────────

export const createDecisionAgentReviewSchema = z.object({
  decision_id: uuidField,
  agent_role: z.enum(AGENT_ROLES),
  position: z.string().min(5).max(5000),
  key_concerns: stringArray,
  supporting_evidence: stringArray,
  assumptions: stringArray,
  risks: stringArray,
  recommendation: z.string().min(5).max(5000),
  confidence_score: confidenceScore,
});
export type CreateDecisionAgentReviewInput = z.infer<typeof createDecisionAgentReviewSchema>;

// ── Recommendation ──────────────────────────────────────────────────

export const createDecisionRecommendationSchema = z.object({
  decision_id: uuidField,
  recommendation: z.string().min(10).max(5000),
  reasoning: stringArray,
  supporting_evidence: stringArray,
  assumptions: stringArray,
  risks: stringArray,
  alternatives: stringArray,
  next_validation_steps: stringArray,
  confidence_score: confidenceScore,
});
export type CreateDecisionRecommendationInput = z.infer<typeof createDecisionRecommendationSchema>;

