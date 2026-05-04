/**
 * Decision Engine – shared enums and TypeScript types.
 *
 * Single source of truth for all category/status string unions used across
 * validation schemas, services, and UI components.
 */

// ── Decision ────────────────────────────────────────────────────────

export const DECISION_CATEGORIES = [
  "product",
  "technical",
  "growth",
  "ux",
  "business",
  "strategy",
  "other",
] as const;
export type DecisionCategory = (typeof DECISION_CATEGORIES)[number];

export const DECISION_STATUSES = [
  "draft",
  "under_review",
  "accepted",
  "rejected",
  "revisit",
] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

// ── Decision Option ─────────────────────────────────────────────────

export const EFFORT_ESTIMATES = ["low", "medium", "high", "unknown"] as const;
export type EffortEstimate = (typeof EFFORT_ESTIMATES)[number];

export const REVERSIBILITY_LEVELS = ["low", "medium", "high", "unknown"] as const;
export type ReversibilityLevel = (typeof REVERSIBILITY_LEVELS)[number];

// ── Assumption ──────────────────────────────────────────────────────

export const ASSUMPTION_TYPES = [
  "market",
  "user",
  "technical",
  "growth",
  "pricing",
  "ux",
  "business",
  "other",
] as const;
export type AssumptionType = (typeof ASSUMPTION_TYPES)[number];

export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const EVIDENCE_STATUSES = [
  "unsupported",
  "weak",
  "moderate",
  "strong",
] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

// ── Evidence ────────────────────────────────────────────────────────

export const EVIDENCE_SOURCE_TYPES = [
  "feedback",
  "document",
  "research",
  "competitor",
  "metric",
  "manual",
  "ai_generated",
  "other",
] as const;
export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

// ── Decision–Evidence Link ──────────────────────────────────────────

export const LINK_TYPES = [
  "supports",
  "contradicts",
  "informs",
  "weakens",
  "validates",
  "invalidates",
] as const;
export type LinkType = (typeof LINK_TYPES)[number];

// ── Agent Review ────────────────────────────────────────────────────

export const AGENT_ROLES = [
  "product_strategist",
  "cto",
  "ux_researcher",
  "growth_marketer",
  "critic",
  "synthesizer",
] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

