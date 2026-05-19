/**
 * Evidence Layer – Intent configuration.
 *
 * Per-intent defaults for retrieval behavior.
 * Easy to extend when new intents are added.
 */

import type { RetrievalIntent, EvidenceSourceType } from "./types";

export interface IntentConfig {
  defaultLimit: number;
  minSimilarity: number;
  /** Hint prepended to the user query to steer embedding similarity. */
  queryPrefix?: string;
  /** Preferred source types (advisory — used for future ranking, not filtering). */
  preferredSourceTypes?: EvidenceSourceType[];
}

export const RETRIEVAL_INTENT_CONFIG: Record<RetrievalIntent, IntentConfig> = {
  chat: {
    defaultLimit: 8,
    minSimilarity: 0.72,
  },
  prd_generation: {
    defaultLimit: 10,
    minSimilarity: 0.68,
    queryPrefix: "product requirements goals constraints user needs",
    preferredSourceTypes: ["feedback", "document", "research"],
  },
  roadmap_planning: {
    defaultLimit: 10,
    minSimilarity: 0.68,
    queryPrefix: "roadmap priorities milestones features timeline",
    preferredSourceTypes: ["feedback", "document", "research", "metric"],
  },
  decision_review: {
    defaultLimit: 12,
    minSimilarity: 0.25,
    queryPrefix: "decision trade-offs risks assumptions evidence",
    preferredSourceTypes: ["feedback", "document", "research", "competitor"],
  },
  risk_analysis: {
    defaultLimit: 10,
    minSimilarity: 0.65,
    queryPrefix: "risks constraints blockers negative feedback concerns",
    preferredSourceTypes: ["feedback", "research"],
  },
  feedback_synthesis: {
    defaultLimit: 15,
    minSimilarity: 0.60,
    preferredSourceTypes: ["feedback"],
  },
  competitive_analysis: {
    defaultLimit: 10,
    minSimilarity: 0.65,
    queryPrefix: "competitors market landscape positioning",
    preferredSourceTypes: ["competitor", "research", "document"],
  },
};

