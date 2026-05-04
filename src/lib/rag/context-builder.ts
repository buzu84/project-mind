import { generateEmbedding } from "./embeddings";
import { searchSimilarChunks, type SearchResult } from "./vector-search";

const MAX_RAG_CHARS = 8000;
const OVERLAP_THRESHOLD = 0.5; // drop chunk if >50% of its content overlaps with a kept chunk

/**
 * Check if two strings have significant content overlap.
 * Uses a simple longest-common-substring ratio heuristic.
 */
function hasSignificantOverlap(a: string, b: string): boolean {
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  // Check if a large portion of the shorter string appears in the longer
  const windowSize = Math.floor(shorter.length * OVERLAP_THRESHOLD);
  if (windowSize < 50) return false; // too short to matter
  // Check overlapping windows from the shorter string
  for (let i = 0; i <= shorter.length - windowSize; i += 50) {
    const window = shorter.slice(i, i + windowSize);
    if (longer.includes(window)) return true;
  }
  return false;
}

/**
 * Deduplicate search results by removing chunks with significant content overlap.
 */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const kept: SearchResult[] = [];
  for (const result of results) {
    const isDuplicate = kept.some((k) => hasSignificantOverlap(k.content, result.content));
    if (!isDuplicate) {
      kept.push(result);
    }
  }
  return kept;
}

/**
 * Retrieve relevant document chunks for a user query and format them
 * as context for the AI prompt.
 */
export async function retrieveRelevantContext(
  query: string,
  projectId: string,
  userId?: string,
): Promise<{ context: string; results: SearchResult[] }> {
  try {
    const queryEmbedding = await generateEmbedding(
      query,
      userId ? { userId, projectId, feature: "query_embedding" } : undefined,
    );
    const rawResults = await searchSimilarChunks(queryEmbedding, projectId);

    if (rawResults.length === 0) {
      return { context: "", results: [] };
    }

    // Deduplicate overlapping chunks
    const results = deduplicateResults(rawResults);


    // Build context string with size guard
    let budget = MAX_RAG_CHARS;
    const parts: string[] = ["\n--- Relevant Feedback & Research (retrieved) ---"];
    budget -= parts[0].length;

    for (const result of results) {
      // Sanitize content to mitigate prompt injection
      const sanitized = result.content
        .replace(/---+/g, "—")  // prevent fake section headers
        .replace(/^(system|assistant|user)\s*:/gim, "[$1]:"); // neutralize role markers
      const entry = `\n[similarity: ${result.similarity.toFixed(2)}]\n${sanitized}`;
      if (entry.length > budget) break;
      parts.push(entry);
      budget -= entry.length;
    }

    return { context: parts.join("\n"), results };
  } catch (err) {
    // If embeddings API is unavailable (e.g. no API key), fail gracefully
    console.error("[rag] Retrieval failed, falling back to no RAG context:", err);
    return { context: "", results: [] };
  }
}
