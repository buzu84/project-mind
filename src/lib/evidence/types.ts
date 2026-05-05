/**
 * Evidence Layer – Types
 *
 * Normalized types for the reusable evidence retrieval layer.
 * Used by chat, PRD generation, roadmap, decision review, and other AI workflows.
 */

// ── Retrieval Intents ────────────────────────────────────────────────

export const RETRIEVAL_INTENTS = [
  "chat",
  "prd_generation",
  "roadmap_planning",
  "decision_review",
  "risk_analysis",
  "feedback_synthesis",
  "competitive_analysis",
] as const;

export type RetrievalIntent = (typeof RETRIEVAL_INTENTS)[number];

// ── Evidence Source Types ────────────────────────────────────────────

export const EVIDENCE_SOURCE_TYPES = [
  "feedback",
  "document",
  "research",
  "competitor",
  "metric",
  "decision",
  "assumption",
  "manual",
  "unknown",
] as const;

export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

// ── EvidenceCandidate ────────────────────────────────────────────────

export interface EvidenceCandidate {
  chunkId: string;
  sourceType: EvidenceSourceType;
  sourceId?: string | null;
  sourceTitle?: string | null;
  content: string;
  similarityScore: number;
  relevanceReason?: string | null;
  metadata?: Record<string, unknown>;
}

// ── Retrieval Input/Output ──────────────────────────────────────────

export interface RetrieveEvidenceInput {
  userId: string;
  projectId: string;
  intent: RetrievalIntent;
  query: string;
  limit?: number;
  minSimilarity?: number;
  filters?: {
    sourceTypes?: EvidenceSourceType[];
    fromDate?: string;
    toDate?: string;
    tags?: string[];
  };
}

export interface RetrieveEvidenceResult {
  candidates: EvidenceCandidate[];
  intent: RetrievalIntent;
  query: string;
  total: number;
}

// ── Citation Types ──────────────────────────────────────────────────

export interface EvidenceCitation {
  citationId: string;
  chunkId: string;
  sourceType: EvidenceSourceType;
  sourceId?: string | null;
  sourceTitle?: string | null;
  snippet: string;
  similarityScore: number;
}

