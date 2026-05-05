/**
 * Evidence Layer – Retrieval logging.
 *
 * Lightweight observability for evidence retrieval events.
 * Logs through the existing AI usage tracking system using metadata.
 *
 * If a dedicated retrieval_logs table is added later, this module
 * can be updated to write there instead.
 */

import { trackAIUsage } from "@/lib/ai/usage-tracking";
import type { RetrievalIntent, EvidenceCandidate } from "./types";

export interface RetrievalLogEntry {
  userId: string;
  projectId: string;
  intent: RetrievalIntent;
  query: string;
  candidates: EvidenceCandidate[];
}

/**
 * Log a retrieval event. Non-blocking — failures are silently caught
 * to avoid breaking user-facing retrieval.
 */
export function logRetrievalEvent(entry: RetrievalLogEntry): void {
  void (async () => {
    try {
      await trackAIUsage({
        userId: entry.userId,
        projectId: entry.projectId,
        model: "evidence-retrieval",
        feature: "rag_search",
        promptTokens: 0,
        completionTokens: 0,
        isMock: false,
        status: "success",
        latencyMs: null,
        metadata: {
          _type: "retrieval_log",
          intent: entry.intent,
          query: entry.query.slice(0, 200),
          candidateCount: entry.candidates.length,
          topSimilarity: entry.candidates[0]?.similarityScore ?? null,
          sourceTypes: [...new Set(entry.candidates.map((c) => c.sourceType))],
          chunkIds: entry.candidates.map((c) => c.chunkId),
        },
      });
    } catch {
      // Logging failure must not break retrieval
    }
  })();
}

