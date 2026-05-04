// ── AI Usage & Cost Tracking Types ──────────────────────────────────

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

export interface AIUsageRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  provider: AIProvider;
  model: string;
  feature: AIUsageFeature;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  input_cost: number;
  output_cost: number;
  estimated_cost: number;
  currency: string;
  is_mock: boolean;
  status: AIUsageStatus;
  error_message: string | null;
  latency_ms: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

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
  document_embedding: "Document Embedding",
  query_embedding: "Query Embedding",
  rag_search: "RAG Search",
  other: "Other",
};

