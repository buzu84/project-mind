/**
 * Phase 3 — JSONB boundary parsers.
 *
 * Each parser accepts the raw `Json | null` that Supabase returns for a JSONB
 * column and returns a strongly-typed view-model — or a safe fallback when the
 * data is missing / malformed.
 *
 * These are intentionally *narrow*: they only validate the fields the UI
 * actually reads, not every possible field the AI might have produced.
 */

import { z } from "zod";
import type { Json } from "@/lib/supabase/types";

// ── Helpers ─────────────────────────────────────────────────────────

function logParseFailure(label: string, issues: z.core.$ZodIssue[]) {
  // Server-side only — safe to use console in a data layer
  // eslint-disable-next-line no-console
  console.warn(
    `[JSONB parse] ${label}: ${issues.map((i) => `${i.path?.join(".")}: ${i.message}`).join("; ")}`,
  );
}

// ── 1. Legacy decisions — PRD ───────────────────────────────────────

const prdInputSchema = z.object({
  productName: z.string().optional(),
  productDescription: z.string().optional(),
  targetAudience: z.string().optional(),
});

const prdOutputSchema = z.object({
  content: z.string(),
});

export interface ParsedPrdInput {
  productName?: string;
  productDescription?: string;
  targetAudience?: string;
}

export interface ParsedPrdOutput {
  content: string;
}

export function parsePrdInput(raw: Json | null): ParsedPrdInput | null {
  if (raw == null) return null;
  const r = prdInputSchema.safeParse(raw);
  if (r.success) return r.data;
  logParseFailure("decisions.input (PRD)", r.error.issues);
  return null;
}

export function parsePrdOutput(raw: Json | null): ParsedPrdOutput | null {
  if (raw == null) return null;
  const r = prdOutputSchema.safeParse(raw);
  if (r.success) return r.data;
  logParseFailure("decisions.output (PRD)", r.error.issues);
  return null;
}

// ── 2. Legacy decisions — Competitive Analysis ──────────────────────

const analysisInputSchema = z.object({
  productName: z.string().optional(),
  industry: z.string().optional(),
  competitors: z.string().optional(),
});

const analysisOutputSchema = z.object({
  content: z.string(),
});

export interface ParsedAnalysisInput {
  productName?: string;
  industry?: string;
  competitors?: string;
}

/** Same shape as PRD output (both are `{ content: string }`), but named distinctly for clarity. */
export type ParsedAnalysisOutput = ParsedPrdOutput;

export function parseAnalysisInput(raw: Json | null): ParsedAnalysisInput | null {
  if (raw == null) return null;
  const r = analysisInputSchema.safeParse(raw);
  if (r.success) return r.data;
  logParseFailure("decisions.input (Analysis)", r.error.issues);
  return null;
}

export function parseAnalysisOutput(raw: Json | null): ParsedAnalysisOutput | null {
  if (raw == null) return null;
  const r = analysisOutputSchema.safeParse(raw);
  if (r.success) return r.data;
  logParseFailure("decisions.output (Analysis)", r.error.issues);
  return null;
}

// ── 3. Legacy decisions — list-page title extraction ────────────────

/** Safely extract `productName` from a decision's JSONB `input`. */
export function parseDecisionInputTitle(raw: Json | null): string | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const name = (raw as Record<string, unknown>).productName;
  return typeof name === "string" ? name : null;
}

// ── 4. Roadmap ──────────────────────────────────────────────────────

const roadmapItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.string().optional(),
  confidence: z.string().optional(),
});

export type ParsedRoadmapItem = z.infer<typeof roadmapItemSchema>;

function parseRoadmapArray(raw: Json | null | undefined, label: string): ParsedRoadmapItem[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    logParseFailure(`roadmap.${label}`, [{ message: "expected array", path: [label], code: "invalid_type" } as z.core.$ZodIssue]);
    return [];
  }
  return raw.flatMap((item, i) => {
    const r = roadmapItemSchema.safeParse(item);
    if (r.success) return [r.data];
    logParseFailure(`roadmap.${label}[${i}]`, r.error.issues);
    // Attempt best-effort recovery: if title exists, use it
    if (typeof item === "object" && item !== null && typeof (item as Record<string, unknown>).title === "string") {
      return [{ title: (item as Record<string, unknown>).title as string, description: String((item as Record<string, unknown>).description ?? "") }];
    }
    return [];
  });
}

export interface ParsedRoadmap {
  id: string;
  project_id: string;
  title: string;
  now_items: ParsedRoadmapItem[];
  next_items: ParsedRoadmapItem[];
  later_items: ParsedRoadmapItem[];
  plan_30_days: ParsedRoadmapItem[];
  plan_60_days: ParsedRoadmapItem[];
  plan_90_days: ParsedRoadmapItem[];
  risks: ParsedRoadmapItem[];
  dependencies: ParsedRoadmapItem[];
  success_metrics: ParsedRoadmapItem[];
  is_mock: boolean;
  created_at: string;
}

/**
 * Parse a raw `roadmaps` DB row (which has Json arrays) into a typed view-model.
 * Invalid individual items are silently dropped; the page still renders.
 */
export function parseRoadmapRow(raw: Record<string, unknown>): ParsedRoadmap {
  return {
    id: String(raw.id ?? ""),
    project_id: String(raw.project_id ?? ""),
    title: String(raw.title ?? ""),
    now_items: parseRoadmapArray(raw.now_items as Json, "now_items"),
    next_items: parseRoadmapArray(raw.next_items as Json, "next_items"),
    later_items: parseRoadmapArray(raw.later_items as Json, "later_items"),
    plan_30_days: parseRoadmapArray(raw.plan_30_days as Json, "plan_30_days"),
    plan_60_days: parseRoadmapArray(raw.plan_60_days as Json, "plan_60_days"),
    plan_90_days: parseRoadmapArray(raw.plan_90_days as Json, "plan_90_days"),
    risks: parseRoadmapArray(raw.risks as Json, "risks"),
    dependencies: parseRoadmapArray(raw.dependencies as Json, "dependencies"),
    success_metrics: parseRoadmapArray(raw.success_metrics as Json, "success_metrics"),
    is_mock: Boolean(raw.is_mock),
    created_at: String(raw.created_at ?? ""),
  };
}

// ── 5. Multi-Agent Review ───────────────────────────────────────────

const agentResponseSchema = z.object({
  summary: z.string(),
  key_points: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
});

const consensusSchema = z.object({
  recommendation: z.string().default("neutral"),
  summary: z.string().default(""),
  disagreements: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  next_steps: z.array(z.string()).default([]),
  overall_confidence: z.number().min(0).max(1).default(0.5),
});

export type ParsedAgentResponse = z.infer<typeof agentResponseSchema>;
export type ParsedConsensus = z.infer<typeof consensusSchema>;

const EMPTY_AGENT: ParsedAgentResponse = {
  summary: "(response unavailable)",
  key_points: [],
  concerns: [],
  recommendations: [],
  confidence: 0,
};

const EMPTY_CONSENSUS: ParsedConsensus = {
  recommendation: "neutral",
  summary: "(consensus unavailable)",
  disagreements: [],
  risks: [],
  next_steps: [],
  overall_confidence: 0,
};

function parseAgentResponse(raw: Json | null | undefined, role: string): ParsedAgentResponse {
  if (raw == null) return EMPTY_AGENT;
  const r = agentResponseSchema.safeParse(raw);
  if (r.success) return r.data;
  logParseFailure(`multi_agent_reviews.${role}`, r.error.issues);
  return EMPTY_AGENT;
}

function parseConsensus(raw: Json | null | undefined): ParsedConsensus {
  if (raw == null) return EMPTY_CONSENSUS;
  const r = consensusSchema.safeParse(raw);
  if (r.success) return r.data;
  logParseFailure("multi_agent_reviews.consensus", r.error.issues);
  return EMPTY_CONSENSUS;
}

export interface ParsedMultiAgentReview {
  id: string;
  project_id: string;
  question: string;
  input_type: string;
  pm_response: ParsedAgentResponse;
  cto_response: ParsedAgentResponse;
  ux_response: ParsedAgentResponse;
  growth_response: ParsedAgentResponse;
  consensus: ParsedConsensus;
  model: string | null;
  is_mock: boolean;
  created_at: string;
}

/**
 * Parse a raw `multi_agent_reviews` DB row into a typed view-model.
 * Malformed persona/consensus data falls back to empty defaults.
 */
export function parseMultiAgentReviewRow(raw: Record<string, unknown>): ParsedMultiAgentReview {
  return {
    id: String(raw.id ?? ""),
    project_id: String(raw.project_id ?? ""),
    question: String(raw.question ?? ""),
    input_type: String(raw.input_type ?? "product_question"),
    pm_response: parseAgentResponse(raw.pm_response as Json, "pm_response"),
    cto_response: parseAgentResponse(raw.cto_response as Json, "cto_response"),
    ux_response: parseAgentResponse(raw.ux_response as Json, "ux_response"),
    growth_response: parseAgentResponse(raw.growth_response as Json, "growth_response"),
    consensus: parseConsensus(raw.consensus as Json),
    model: raw.model == null ? null : String(raw.model),
    is_mock: Boolean(raw.is_mock),
    created_at: String(raw.created_at ?? ""),
  };
}

// ── 6. Insights metadata ────────────────────────────────────────────

const insightMetadataSchema = z.object({
  priority: z.string().default("medium"),
  confidence: z.string().default("medium"),
  suggested_action: z.string().optional(),
});

export interface ParsedInsightMetadata {
  priority: string;
  confidence: string;
  suggested_action?: string;
}

export function parseInsightMetadata(raw: Json | null): ParsedInsightMetadata | null {
  if (raw == null) return null;
  const r = insightMetadataSchema.safeParse(raw);
  if (r.success) return r.data;
  logParseFailure("insights.metadata", r.error.issues);
  return { priority: "medium", confidence: "medium" };
}

// ── 7. Generic JSONB string-array parser ────────────────────────────

/**
 * Safely parse a JSONB field expected to be `string[]`.
 * Used for Decision Engine child-table arrays: pros, cons, risks,
 * concerns, suggestions, alternatives, next_validation_steps, etc.
 *
 * Returns `string[]` — filters out non-string items silently.
 */
export function parseJsonStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}
