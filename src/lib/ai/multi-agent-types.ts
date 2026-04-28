// ── Multi-Agent Review Types ────────────────────────────────────────

export type AgentRole = "pm" | "cto" | "ux" | "growth";

export type InputType = "product_question" | "feature_idea";

export type RecommendationLevel =
  | "strongly_recommend"
  | "recommend"
  | "neutral"
  | "not_recommended"
  | "needs_more_research";

export interface AgentResponse {
  summary: string;
  key_points: string[];
  concerns: string[];
  recommendations: string[];
  confidence: number; // 0–1
}

export interface ConsensusResponse {
  recommendation: RecommendationLevel;
  summary: string;
  disagreements: string[];
  risks: string[];
  next_steps: string[];
  overall_confidence: number; // 0–1
}

export interface MultiAgentReview {
  id: string;
  project_id: string;
  question: string;
  input_type: InputType;
  pm_response: AgentResponse;
  cto_response: AgentResponse;
  ux_response: AgentResponse;
  growth_response: AgentResponse;
  consensus: ConsensusResponse;
  model: string | null;
  is_mock: boolean;
  created_at: string;
}

export interface MultiAgentReviewInput {
  projectId: string;
  question: string;
  inputType: InputType;
  includeContext?: boolean;
  includeRag?: boolean;
  includeInsights?: boolean;
}

export const AGENT_LABELS: Record<AgentRole, { title: string; emoji: string; color: string }> = {
  pm: { title: "Product Manager", emoji: "\uD83D\uDCCB", color: "text-blue-700 bg-blue-50 border-blue-200" },
  cto: { title: "CTO", emoji: "\u2699\uFE0F", color: "text-purple-700 bg-purple-50 border-purple-200" },
  ux: { title: "UX Researcher", emoji: "\uD83D\uDD0D", color: "text-pink-700 bg-pink-50 border-pink-200" },
  growth: { title: "Growth Marketer", emoji: "\uD83D\uDCC8", color: "text-green-700 bg-green-50 border-green-200" },
};

export const RECOMMENDATION_CONFIG: Record<RecommendationLevel, { label: string; variant: "success" | "info" | "warning" | "danger" | "default" }> = {
  strongly_recommend: { label: "Strongly Recommend", variant: "success" },
  recommend: { label: "Recommend", variant: "success" },
  neutral: { label: "Neutral", variant: "info" },
  not_recommended: { label: "Not Recommended", variant: "danger" },
  needs_more_research: { label: "Needs More Research", variant: "warning" },
};

