import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  project_id?: string;
  document_id?: string;
}

interface VectorSearchDiagnostics {
  projectId: string;
  chunkCount: number;
  queryEmbeddingLength: number;
  thresholdAttempts: { threshold: number; resultCount: number }[];
  finalThreshold: number | null;
  rpcResultCount: number;
  rpcError: string | null;
  fallbackUsed: boolean;
  minSimilarity: number | null;
  maxSimilarity: number | null;
}

const THRESHOLD_DEGRADATION = [0.3, 0.2, 0.0];
const FALLBACK_LIMIT = 5;

/**
 * Search for document chunks similar to the query embedding.
 * Uses Supabase match_document_chunks RPC with threshold degradation.
 * Falls back to recent chunks only as last resort.
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  projectId: string,
  threshold = 0.3,
  limit = 8,
): Promise<SearchResult[]> {
  const supabase = createClient();
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const diag: VectorSearchDiagnostics = {
    projectId,
    chunkCount: 0,
    queryEmbeddingLength: queryEmbedding.length,
    thresholdAttempts: [],
    finalThreshold: null,
    rpcResultCount: 0,
    rpcError: null,
    fallbackUsed: false,
    minSimilarity: null,
    maxSimilarity: null,
  };

  // Count chunks for diagnostics
  const { count } = await supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  diag.chunkCount = count ?? 0;

  if (diag.chunkCount === 0) {
    return [];
  }

  // Try threshold degradation: configured → 0.2 → 0.0
  const thresholds = [threshold, ...THRESHOLD_DEGRADATION.filter((t) => t < threshold)];
  // Deduplicate
  const uniqueThresholds = [...new Set(thresholds)];

  for (const t of uniqueThresholds) {
    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: embeddingStr,
      match_project_id: projectId,
      match_threshold: t,
      match_count: limit,
    });

    if (error) {
      diag.rpcError = `${error.message} [${error.code}] ${error.hint ?? ""}`.trim();
      diag.thresholdAttempts.push({ threshold: t, resultCount: -1 });
      // RPC itself is broken — stop trying thresholds
      break;
    }

    const results = (data ?? []) as SearchResult[];
    diag.thresholdAttempts.push({ threshold: t, resultCount: results.length });

    if (results.length > 0) {
      diag.finalThreshold = t;
      diag.rpcResultCount = results.length;
      const similarities = results.map((r) => r.similarity ?? 0);
      diag.minSimilarity = Math.min(...similarities);
      diag.maxSimilarity = Math.max(...similarities);

      // Defense-in-depth: verify every chunk belongs to the requested project
      if (isDev) {
        for (const r of results) {
          if (r.project_id && r.project_id !== projectId) {
            // eslint-disable-next-line no-console
            console.error(
              `[rag] CROSS-PROJECT LEAK DETECTED: chunk ${r.id} belongs to project ${r.project_id}, not ${projectId}`,
            );
          }
        }
        // eslint-disable-next-line no-console
        console.log(
          "[rag] Chunks:",
          results.map((r) => ({
            id: r.id,
            projMatch: r.project_id === projectId || !r.project_id,
            sim: r.similarity?.toFixed(3),
            preview: r.content?.slice(0, 80),
          })),
        );
      }

      // Strip internal fields before returning
      const cleaned = results.map((r) => ({
        id: r.id,
        content: r.content,
        similarity: r.similarity,
      }));

      logDiagnostics(diag);
      return cleaned;
    }
  }

  // All thresholds failed — fallback to recent chunks
  diag.fallbackUsed = true;
  logDiagnostics(diag);

  return recentChunksFallback(supabase, projectId, Math.min(limit, FALLBACK_LIMIT));
}

const isDev = process.env.NODE_ENV === "development";

function logDiagnostics(diag: VectorSearchDiagnostics): void {
  const summary = {
    projectId: diag.projectId,
    chunks: diag.chunkCount,
    embDim: diag.queryEmbeddingLength,
    attempts: diag.thresholdAttempts.map((a) => `t=${a.threshold}→${a.resultCount}`).join(", "),
    finalThreshold: diag.finalThreshold,
    rpcResults: diag.rpcResultCount,
    rpcError: diag.rpcError,
    fallback: diag.fallbackUsed,
    similarityRange: diag.rpcResultCount > 0
      ? `${diag.minSimilarity?.toFixed(3)}–${diag.maxSimilarity?.toFixed(3)}`
      : null,
  };
  if (diag.rpcError) {
    // eslint-disable-next-line no-console
    console.error("[rag] Vector search diagnostics:", JSON.stringify(summary));
  } else if (diag.fallbackUsed) {
    // eslint-disable-next-line no-console
    console.warn("[rag] Vector search fell back to recent chunks:", JSON.stringify(summary));
  } else if (isDev) {
    // eslint-disable-next-line no-console
    console.log("[rag] Vector search OK:", JSON.stringify(summary));
  }
}

/**
 * Fallback: return recent chunks without similarity scoring.
 * Only used when RPC completely fails or returns 0 at all thresholds.
 */
async function recentChunksFallback(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  limit: number,
): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from("document_chunks")
    .select("id, content")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) {
    return [];
  }

  return (data as { id: string; content: string }[]).map((c) => ({
    id: c.id,
    content: c.content,
    similarity: 0,
  }));
}
