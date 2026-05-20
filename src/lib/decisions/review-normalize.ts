/**
 * Decision Review – Normalization & error formatting utilities.
 *
 * Fixes harmless AI output variations before Zod validation:
 * - snake_case → camelCase key mapping
 * - numeric strings → numbers (for confidenceScore)
 * - null optional arrays → []
 *
 * Does NOT hide serious schema bugs — only normalizes known safe variations.
 */

import { type ZodError, type ZodIssue } from "zod";

const isDev = process.env.NODE_ENV === "development";

// ── Assumption type alias mapping ───────────────────────────────────
// GPT often picks reasonable but non-enum assumption types.
// Map them to the closest allowed value rather than failing validation.

const ASSUMPTION_TYPE_ALIASES: Record<string, string> = {
  // → business
  legal: "business",
  compliance: "business",
  regulatory: "business",
  operational: "business",
  execution: "business",
  process: "business",
  strategy: "business",
  product: "business",
  organizational: "business",
  partnership: "business",
  // → pricing (financial domain)
  financial: "pricing",
  revenue: "pricing",
  monetization: "pricing",
  cost: "pricing",
  // → ux
  usability: "ux",
  design: "ux",
  accessibility: "ux",
  // → growth
  adoption: "growth",
  acquisition: "growth",
  retention: "growth",
  engagement: "growth",
  viral: "growth",
  // → user
  customer: "user",
  persona: "user",
  demographic: "user",
  // → technical
  engineering: "technical",
  architecture: "technical",
  infrastructure: "technical",
  security: "technical",
  performance: "technical",
  scalability: "technical",
};

const VALID_ASSUMPTION_TYPES = new Set([
  "market", "user", "technical", "growth", "pricing", "ux", "business", "other",
]);

function normalizeAssumptionType(value: unknown): string {
  if (typeof value !== "string") return "other";
  const lower = value.toLowerCase().trim();
  if (VALID_ASSUMPTION_TYPES.has(lower)) return lower;
  const mapped = ASSUMPTION_TYPE_ALIASES[lower];
  if (mapped) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(`[normalize] assumption.type "${value}" → "${mapped}"`);
    }
    return mapped;
  }
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(`[normalize] assumption.type "${value}" → "other" (unmapped)`);
  }
  return "other";
}

// ── Other enum normalizers ──────────────────────────────────────────

const EVIDENCE_STATUS_ALIASES: Record<string, string> = {
  none: "unsupported", unknown: "unsupported", missing: "unsupported",
  partial: "weak", limited: "weak", anecdotal: "weak",
  mixed: "moderate", some: "moderate",
  confirmed: "strong", validated: "strong", proven: "strong",
};
const VALID_EVIDENCE_STATUS = new Set(["unsupported", "weak", "moderate", "strong"]);

function normalizeEvidenceStatus(value: unknown): string {
  if (typeof value !== "string") return "unsupported";
  const lower = value.toLowerCase().trim();
  if (VALID_EVIDENCE_STATUS.has(lower)) return lower;
  return EVIDENCE_STATUS_ALIASES[lower] ?? "unsupported";
}

const RISK_LEVEL_ALIASES: Record<string, string> = {
  critical: "high", severe: "high", very_high: "high",
  moderate: "medium", normal: "medium",
  minimal: "low", negligible: "low", none: "low",
};
const VALID_RISK_LEVELS = new Set(["low", "medium", "high"]);

function normalizeRiskLevel(value: unknown): string {
  if (typeof value !== "string") return "medium";
  const lower = value.toLowerCase().trim();
  if (VALID_RISK_LEVELS.has(lower)) return lower;
  return RISK_LEVEL_ALIASES[lower] ?? "medium";
}

const EFFORT_ALIASES: Record<string, string> = {
  trivial: "low", small: "low", easy: "low",
  moderate: "medium", normal: "medium",
  large: "high", significant: "high", complex: "high",
  unclear: "unknown", uncertain: "unknown", tbd: "unknown",
};
const VALID_EFFORT = new Set(["low", "medium", "high", "unknown"]);

function normalizeEffort(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const lower = value.toLowerCase().trim();
  if (VALID_EFFORT.has(lower)) return lower;
  return EFFORT_ALIASES[lower] ?? "unknown";
}

// ── snake_case → camelCase key mappings ─────────────────────────────

const KEY_MAP: Record<string, string> = {
  confidence_score: "confidenceScore",
  risk_level: "riskLevel",
  evidence_status: "evidenceStatus",
  validation_method: "validationMethod",
  supporting_citation_ids: "supportingCitationIds",
  expected_impact: "expectedImpact",
  effort_estimate: "effortEstimate",
  supporting_evidence: "supportingEvidence",
  next_validation_steps: "nextValidationSteps",
};

function remapKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const mapped = KEY_MAP[key] ?? key;
    result[mapped] = value;
  }
  return result;
}

function toNumberIfNumericString(value: unknown): unknown {
  if (typeof value === "string") {
    const n = Number(value);
    if (!isNaN(n) && value.trim() !== "") return n;
  }
  return value;
}

function normalizeItem(item: unknown): unknown {
  if (item === null || item === undefined || typeof item !== "object") return item;
  if (Array.isArray(item)) return item.map(normalizeItem);

  const obj = remapKeys(item as Record<string, unknown>);

  // Convert confidenceScore from string to number
  if ("confidenceScore" in obj) {
    obj.confidenceScore = toNumberIfNumericString(obj.confidenceScore);
  }

  // Normalize assumption type enum aliases
  if ("type" in obj && "statement" in obj) {
    obj.type = normalizeAssumptionType(obj.type);
  }

  // Normalize other enums
  if ("riskLevel" in obj) obj.riskLevel = normalizeRiskLevel(obj.riskLevel);
  if ("evidenceStatus" in obj) obj.evidenceStatus = normalizeEvidenceStatus(obj.evidenceStatus);
  if ("effortEstimate" in obj) obj.effortEstimate = normalizeEffort(obj.effortEstimate);
  if ("reversibility" in obj) obj.reversibility = normalizeEffort(obj.reversibility);
  if ("severity" in obj) obj.severity = normalizeRiskLevel(obj.severity);

  // Normalize nested arrays/objects
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      obj[key] = value.map(normalizeItem);
    } else if (value && typeof value === "object") {
      obj[key] = normalizeItem(value);
    }
  }

  return obj;
}

/**
 * Normalize raw AI output before Zod validation.
 */
export function normalizeDecisionReviewOutput(raw: Record<string, unknown>): Record<string, unknown> {
  const out = remapKeys(raw);

  // Top-level confidenceScore
  if ("confidenceScore" in out) {
    out.confidenceScore = toNumberIfNumericString(out.confidenceScore);
  }

  // Normalize arrays of objects
  for (const key of ["assumptions", "options", "risks"]) {
    if (Array.isArray(out[key])) {
      out[key] = (out[key] as unknown[]).map(normalizeItem);
    }
  }

  // Normalize recommendation object
  if (out.recommendation && typeof out.recommendation === "object" && !Array.isArray(out.recommendation)) {
    out.recommendation = normalizeItem(out.recommendation);
  }

  // Ensure optional arrays in recommendation default to [] if null
  if (out.recommendation && typeof out.recommendation === "object") {
    const rec = out.recommendation as Record<string, unknown>;
    for (const field of ["supportingEvidence", "assumptions", "risks", "alternatives", "nextValidationSteps"]) {
      if (rec[field] === null || rec[field] === undefined) {
        rec[field] = [];
      }
    }
  }

  return out;
}

// ── Zod error formatting ────────────────────────────────────────────

/**
 * Format Zod issues for dev logging (safe, no user content).
 * Returns an array of short lines like:
 *   "options[0].confidenceScore: expected number, received string"
 */
export function formatZodIssuesForLog(error: ZodError): string[] {
  return error.issues.slice(0, 15).map((issue: ZodIssue) => {
    const path = issue.path.join(".");
    if ((issue as any).code === "invalid_enum_value") {
      const i = issue as any;
      return `${path}: expected enum ${JSON.stringify(i.options)}, received ${JSON.stringify(i.received)} (type: ${typeof i.received})`;
    }
    if ("expected" in issue && "received" in issue) {
      return `${path}: expected ${(issue as any).expected}, received ${JSON.stringify((issue as any).received)} (type: ${typeof (issue as any).received})`;
    }
    return `${path}: ${issue.message}`;
  });
}

/**
 * Format Zod issues for the retry correction prompt.
 * Concise, no sensitive data.
 */
export function formatZodIssuesForRetry(error: ZodError): string {
  return error.issues.slice(0, 10).map((issue: ZodIssue) => {
    const path = issue.path.join(".");
    if ("expected" in issue && "received" in issue) {
      return `${path}: expected ${issue.expected}, got ${issue.received}`;
    }
    return `${path}: ${issue.message}`;
  }).join("; ");
}



