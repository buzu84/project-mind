/**
 * Evidence Layer – Retrieval service.
 *
 * Reusable retrieval that serves chat, PRD, roadmap, decision review,
 * and other AI workflows. Built on top of the existing RAG pipeline.
 *
 * Security: always requires userId + projectId. Never retrieves globally.
 */

import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/rag/embeddings";
import { searchSimilarChunks } from "@/lib/rag/vector-search";
import { RETRIEVAL_INTENT_CONFIG } from "./intent-config";
import { logRetrievalEvent } from "./retrieval-log";
import type {
  RetrieveEvidenceInput,
  RetrieveEvidenceResult,
  EvidenceCandidate,
  EvidenceSourceType,
} from "./types";

/**
 * Retrieve evidence candidates for a given query and intent.
 *
 * Uses the existing pgvector similarity search and enriches results
 * with source metadata (document title, source type) from feedback_documents.
 */
export async function retrieveEvidence(
  input: RetrieveEvidenceInput,
): Promise<RetrieveEvidenceResult> {
  const { userId, projectId, intent, query, filters } = input;

  if (!userId || !projectId) {
    throw new Error("userId and projectId are required for evidence retrieval.");
  }

  // Resolve config
  const config = RETRIEVAL_INTENT_CONFIG[intent];
  const limit = input.limit ?? config.defaultLimit;
  const minSimilarity = input.minSimilarity ?? config.minSimilarity;

  // Build effective query: prepend intent hint if configured
  const effectiveQuery = config.queryPrefix
    ? `${config.queryPrefix} ${query}`
    : query;

  // ── 1. Verify project ownership ──────────────────────────────────
  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (!project) {
    return { candidates: [], intent, query, total: 0 };
  }

  // ── 2. Generate query embedding ──────────────────────────────────
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(effectiveQuery, {
      userId,
      projectId,
      feature: "query_embedding",
    });
  } catch {
    // Embedding API unavailable — return empty
    return { candidates: [], intent, query, total: 0 };
  }

  // ── 3. Vector search ─────────────────────────────────────────────
  const rawResults = await searchSimilarChunks(
    queryEmbedding,
    projectId,
    minSimilarity,
    // Fetch extra to allow for post-filtering
    limit + 10,
  );

  if (rawResults.length === 0) {
    return { candidates: [], intent, query, total: 0 };
  }

  // ── 4. Enrich with source metadata ───────────────────────────────
  // Look up document_chunks → feedback_documents to get titles/sources
  const chunkIds = rawResults.map((r) => r.id);

  const { data: chunkMeta } = await supabase
    .from("document_chunks")
    .select("id, document_id")
    .in("id", chunkIds);

  // Map chunk_id → document_id
  const chunkToDoc = new Map<string, string>();
  for (const row of chunkMeta ?? []) {
    chunkToDoc.set(row.id, row.document_id);
  }

  // Fetch unique document metadata
  const uniqueDocIds = [...new Set(chunkToDoc.values())];
  const docMetaMap = new Map<string, { title: string; source: string | null }>();

  if (uniqueDocIds.length > 0) {
    const { data: docs } = await supabase
      .from("feedback_documents")
      .select("id, title, source")
      .in("id", uniqueDocIds);

    for (const doc of docs ?? []) {
      docMetaMap.set(doc.id, { title: doc.title, source: doc.source });
    }
  }

  // ── 5. Normalize into EvidenceCandidate ──────────────────────────
  let candidates: EvidenceCandidate[] = rawResults
    // Quality gate: discard chunks that fell below the intent's minSimilarity
    // (threshold degradation in vector-search may have returned lower-quality chunks)
    .filter((result) => result.similarity >= minSimilarity)
    .map((result) => {
    const docId = chunkToDoc.get(result.id) ?? null;
    const docMeta = docId ? docMetaMap.get(docId) : null;

    // Infer source type from feedback_documents.source field
    const sourceType = inferSourceType(docMeta?.source ?? null);

    return {
      chunkId: result.id,
      sourceType,
      sourceId: docId,
      sourceTitle: docMeta?.title ?? null,
      content: result.content,
      similarityScore: result.similarity,
      metadata: docMeta?.source ? { originalSource: docMeta.source } : undefined,
    };
  });

  // ── 6. Apply post-filters ────────────────────────────────────────
  if (filters?.sourceTypes && filters.sourceTypes.length > 0) {
    const allowed = new Set(filters.sourceTypes);
    candidates = candidates.filter((c) => allowed.has(c.sourceType));
  }

  // Note: fromDate/toDate/tags filters are not supported by the current
  // document_chunks schema (no timestamp or tags on chunks).
  // These are documented as unsupported and will be no-ops.

  // ── 7. Trim to limit ─────────────────────────────────────────────
  candidates = candidates.slice(0, limit);

  // ── 8. Log retrieval event (non-blocking) ────────────────────────
  logRetrievalEvent({ userId, projectId, intent, query, candidates });

  return {
    candidates,
    intent,
    query,
    total: candidates.length,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Infer evidence source type from the feedback_documents.source field.
 * This field is free-text in the current schema.
 */
function inferSourceType(source: string | null): EvidenceSourceType {
  if (!source) return "feedback";

  const lower = source.toLowerCase();
  if (lower.includes("competitor") || lower.includes("competitive")) return "competitor";
  if (lower.includes("research") || lower.includes("study")) return "research";
  if (lower.includes("metric") || lower.includes("analytics") || lower.includes("data")) return "metric";
  if (lower.includes("document") || lower.includes("doc") || lower.includes("spec")) return "document";
  if (lower.includes("interview") || lower.includes("feedback") || lower.includes("survey")) return "feedback";

  return "feedback"; // Default for feedback_documents
}



