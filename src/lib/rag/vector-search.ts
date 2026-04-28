import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
}

/**
 * Search for document chunks similar to the query embedding.
 * Uses Supabase's match_document_chunks RPC (pgvector cosine similarity).
 *
 * @param queryEmbedding - The embedding vector for the user query
 * @param projectId - Scope search to this project
 * @param threshold - Minimum cosine similarity (default 0.72)
 * @param limit - Maximum number of results (default 8)
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  projectId: string,
  threshold = 0.72,
  limit = 8,
): Promise<SearchResult[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: `[${queryEmbedding.join(",")}]`,
    match_project_id: projectId,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    console.error("[rag] Vector search failed:", error.message);
    return [];
  }

  return (data ?? []) as SearchResult[];
}
