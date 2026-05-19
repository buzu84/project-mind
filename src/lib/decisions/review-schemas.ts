/**
 * Decision Review – Zod schemas for structured AI output.
 *
 * Defines the expected shape of the AI's decision analysis response.
 * Used for validation before saving to product_* tables.
 */

import { z } from "zod";

const assumptionTypeEnum = z.enum([
  "market", "user", "technical", "growth", "pricing", "ux", "business", "other",
]);

const riskLevelEnum = z.enum(["low", "medium", "high"]);

const evidenceStatusEnum = z.enum(["unsupported", "weak", "moderate", "strong"]);

const effortEnum = z.enum(["low", "medium", "high", "unknown"]);

const reversibilityEnum = z.enum(["low", "medium", "high", "unknown"]);

export const decisionReviewOutputSchema = z.object({
  summary: z.string().min(10).max(5000),
  confidenceScore: z.number().min(0).max(100),
  assumptions: z.array(z.object({
    statement: z.string().min(5).max(2000),
    type: assumptionTypeEnum,
    riskLevel: riskLevelEnum,
    evidenceStatus: evidenceStatusEnum,
    validationMethod: z.string().max(1000).optional(),
    supportingCitationIds: z.array(z.string()).optional(),
  })).min(1).max(15),
  options: z.array(z.object({
    title: z.string().min(2).max(200),
    description: z.string().max(5000),
    pros: z.array(z.string().max(500)).min(1).max(10),
    cons: z.array(z.string().max(500)).min(1).max(10),
    risks: z.array(z.string().max(500)).max(10),
    expectedImpact: z.string().max(1000).optional(),
    effortEstimate: effortEnum,
    reversibility: reversibilityEnum,
    confidenceScore: z.number().min(0).max(100),
    supportingCitationIds: z.array(z.string()).optional(),
  })).min(3).max(4),
  risks: z.array(z.object({
    title: z.string().min(2).max(200),
    description: z.string().max(2000),
    severity: riskLevelEnum,
    mitigation: z.string().max(1000).optional(),
    supportingCitationIds: z.array(z.string()).optional(),
  })).min(1).max(15),
  recommendation: z.object({
    recommendation: z.string().min(10).max(5000),
    reasoning: z.array(z.string().max(500)).min(1).max(10),
    supportingEvidence: z.array(z.string().max(500)).max(10),
    assumptions: z.array(z.string().max(500)).max(10),
    risks: z.array(z.string().max(500)).max(10),
    alternatives: z.array(z.string().max(500)).max(10),
    nextValidationSteps: z.array(z.string().max(500)).max(10),
    confidenceScore: z.number().min(0).max(100),
  }),
});

export type DecisionReviewOutput = z.infer<typeof decisionReviewOutputSchema>;

