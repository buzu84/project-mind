// ── AI Usage & Cost Tracking Types ──────────────────────────────────

import type { Tables } from "@/lib/supabase/types";

export type AIProvider = "openai";

export type AIUsageFeature =
  | "chat"
  | "insights"
  | "roadmap"
  | "multi_agent_review"
  | "feature_prioritization"
  | "prd"
  | "competitive_analysis"
  | "document_embedding"
  | "query_embedding"
  | "decision_review"
  | "rag_search"
  | "other";

export type AIUsageStatus = "success" | "error" | "skipped";

export interface AIModelPricing {
  provider: AIProvider;
  model: string;
  inputCostPer1MTokens: number;
  outputCostPer1MTokens: number;
}

export interface AICostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface TrackAIUsageInput {
  userId: string;
  projectId?: string | null;
  provider?: AIProvider;
  model: string;
  feature: AIUsageFeature;
  promptTokens: number;
  completionTokens: number;
  isMock: boolean;
  status?: AIUsageStatus;
  errorMessage?: string | null;
  latencyMs?: number | null;
  metadata?: Record<string, unknown> | null;
}

/** DB row type for `ai_usage` — derived from generated Supabase types. */
export type AIUsageRecord = Tables<"ai_usage">;

export interface AIUsageSummary {
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  topFeature: string | null;
  allMock: boolean;
}

export const FEATURE_LABELS: Record<AIUsageFeature, string> = {
  chat: "AI Chat",
  insights: "AI Insights",
  roadmap: "Roadmap Generator",
  multi_agent_review: "Multi-Agent Review",
  feature_prioritization: "Feature Prioritization",
  prd: "PRD Generator",
  competitive_analysis: "Competitive Analysis",
  decision_review: "Decision Review",
  document_embedding: "Document Embedding",
  query_embedding: "Query Embedding",
  rag_search: "RAG Search",
  other: "Other",
};

