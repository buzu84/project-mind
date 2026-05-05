import { generateEmbedding } from "./embeddings";
import { searchSimilarChunks, type SearchResult } from "./vector-search";

const MAX_RAG_CHARS = 8000;
const isDev = process.env.NODE_ENV === "development";
const OVERLAP_THRESHOLD = 0.5; // drop chunk if >50% of its content overlaps with a kept chunk

/**
 * Minimum similarity score for a chunk to be included in the prompt.
 * Chunks below this threshold are retrieved (for diagnostics) but discarded
 * before prompt assembly. This prevents low-quality context from reaching the model.
 */
export const MIN_PROMPT_SIMILARITY = 0.2;

/**
 * Similarity threshold above which we skip the lexical guard entirely.
 * Very high similarity means the embedding model is highly confident — trust it.
 */
const LEXICAL_GUARD_BYPASS_SIMILARITY = 0.55;

export interface RetrievalQualityStats {
  retrievedChunks: number;
  usedChunks: number;
  discardedChunks: number;
  minSimilarityUsed: number | null;
  maxSimilarityUsed: number | null;
  hasRelevantContext: boolean;
  lexicalGuardApplied: boolean;
  lexicalMatched: boolean;
  discardedByLexicalGuard: number;
}

// ── Lexical relevance guard ─────────────────────────────────────────

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it", "they",
  "them", "this", "that", "these", "those", "what", "which", "who", "whom",
  "how", "when", "where", "why",
  "in", "on", "at", "to", "for", "of", "with", "by", "from", "about",
  "into", "through", "during", "before", "after", "above", "below",
  "and", "but", "or", "nor", "not", "no", "so", "if", "then",
  "get", "got", "give", "gave", "tell", "told", "said", "say",
  "just", "also", "very", "much", "more", "most", "some", "any", "all",
  "each", "every", "both", "few", "many", "such", "own", "same", "than",
  "too", "only", "other", "new", "old", "over", "out", "up", "down",
]);

/**
 * Common product/research domain terms that are NOT distinctive.
 * These appear in broad questions and should not trigger the lexical guard.
 */
const DOMAIN_GENERIC_TERMS = new Set([
  "points", "users", "user", "feedback", "project", "product", "feature",
  "features", "problem", "problems", "issue", "issues", "pain", "pains",
  "main", "data", "context", "report", "reports", "result", "results",
  "metric", "metrics", "review", "reviews", "insight", "insights",
  "summary", "analysis", "roadmap", "decision", "decisions",
  "goals", "target", "market", "customer", "customers", "onboarding",
  "growth", "retention", "churn", "conversion", "experience", "design",
  "research", "survey", "interview", "testing", "launch", "release",
  "priority", "priorities", "requirement", "requirements", "strategy",
  "competitor", "competitors", "performance", "value", "score",
]);

/**
 * Extract distinctive terms from a query.
 * Distinctive = hyphenated compounds, quoted phrases, or specific non-generic tokens.
 */
function extractDistinctiveTerms(query: string): string[] {
  const terms: string[] = [];

  // 1. Extract quoted phrases (single or double quotes)
  const quotedRe = /["']([^"']{2,})["']/g;
  let m: RegExpExecArray | null;
  while ((m = quotedRe.exec(query)) !== null) {
    terms.push(m[1].toLowerCase().trim());
  }

  // 2. Extract hyphenated compounds (e.g. xylophone-pasta-maker, quasar-loyalty-points)
  const hyphenatedRe = /\b([a-zA-Z]+-[a-zA-Z]+(?:-[a-zA-Z]+)*)\b/g;
  while ((m = hyphenatedRe.exec(query)) !== null) {
    terms.push(m[1].toLowerCase());
  }

  // 3. Extract long non-stopword, non-domain-generic tokens (≥ 5 chars)
  // Only if no hyphenated/quoted terms were found — these are weaker signals
  if (terms.length === 0) {
    const words = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 5 && !STOPWORDS.has(w) && !DOMAIN_GENERIC_TERMS.has(w));

    // Only treat as distinctive if there are few specific words (specific query)
    if (words.length >= 1 && words.length <= 3) {
      terms.push(...words);
    }
  }

  // Deduplicate
  return [...new Set(terms)];
}

/**
 * Normalize text for lexical matching: lowercase, collapse hyphens/underscores to spaces.
 */
function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[-_]/g, " ");
}

/**
 * Check if chunk content contains at least one of the distinctive terms.
 * Normalizes hyphens/spaces so "xylophone-pasta-maker" matches "xylophone pasta maker".
 */
function chunkMatchesDistinctiveTerms(
  chunkContent: string,
  distinctiveTerms: string[],
): boolean {
  const normalizedContent = normalizeForMatch(chunkContent);
  return distinctiveTerms.some((term) => {
    const normalizedTerm = normalizeForMatch(term);
    return normalizedContent.includes(normalizedTerm);
  });
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
 * Retrieve relevant document chunks for a user query and format them
 * as context for the AI prompt.
 */
export async function retrieveRelevantContext(
  query: string,
  projectId: string,
  userId?: string,
): Promise<{ context: string; results: SearchResult[]; qualityStats: RetrievalQualityStats }> {
  const emptyStats: RetrievalQualityStats = {
    retrievedChunks: 0,
    usedChunks: 0,
    discardedChunks: 0,
    minSimilarityUsed: null,
    maxSimilarityUsed: null,
    hasRelevantContext: false,
    lexicalGuardApplied: false,
    lexicalMatched: false,
    discardedByLexicalGuard: 0,
  };

  try {
    const queryEmbedding = await generateEmbedding(
      query,
      userId ? { userId, projectId, feature: "query_embedding" } : undefined,
    );
    const rawResults = await searchSimilarChunks(queryEmbedding, projectId);

    if (rawResults.length === 0) {
      return { context: "", results: [], qualityStats: emptyStats };
    }

    // Deduplicate overlapping chunks
    const deduplicated = deduplicateResults(rawResults);

    // Quality gate: discard chunks below MIN_PROMPT_SIMILARITY
    const qualityFiltered = deduplicated.filter((r) => r.similarity >= MIN_PROMPT_SIMILARITY);

    // ── Lexical relevance guard ──────────────────────────────────
    // For queries with distinctive named entities, require at least one
    // distinctive term to appear in the chunk. This prevents false-positive
    // relevance when vector similarity is moderate but the chunk is about
    // a completely different topic.
    const distinctiveTerms = extractDistinctiveTerms(query);
    const lexicalGuardApplied = distinctiveTerms.length > 0;
    let lexicalFiltered: SearchResult[];
    let discardedByLexicalGuard = 0;

    if (lexicalGuardApplied) {
      lexicalFiltered = qualityFiltered.filter((r) => {
        // High-confidence embeddings bypass the lexical guard
        if (r.similarity >= LEXICAL_GUARD_BYPASS_SIMILARITY) return true;
        return chunkMatchesDistinctiveTerms(r.content, distinctiveTerms);
      });
      discardedByLexicalGuard = qualityFiltered.length - lexicalFiltered.length;
    } else {
      lexicalFiltered = qualityFiltered;
    }

    const lexicalMatched = lexicalGuardApplied && lexicalFiltered.length > 0;

    const stats: RetrievalQualityStats = {
      retrievedChunks: rawResults.length,
      usedChunks: lexicalFiltered.length,
      discardedChunks: deduplicated.length - lexicalFiltered.length,
      minSimilarityUsed: lexicalFiltered.length > 0
        ? Math.min(...lexicalFiltered.map((r) => r.similarity))
        : null,
      maxSimilarityUsed: lexicalFiltered.length > 0
        ? Math.max(...lexicalFiltered.map((r) => r.similarity))
        : null,
      hasRelevantContext: lexicalFiltered.length > 0,
      lexicalGuardApplied,
      lexicalMatched,
      discardedByLexicalGuard,
    };

    if (isDev) {
      // eslint-disable-next-line no-console
      console.log("[rag] Quality filter:", JSON.stringify({
        ...stats,
        distinctiveTerms: distinctiveTerms.length > 0 ? distinctiveTerms : undefined,
      }));
    }

    if (lexicalFiltered.length === 0) {
      return { context: "", results: rawResults, qualityStats: stats };
    }

    // Build context string with size guard
    let budget = MAX_RAG_CHARS;
    const parts: string[] = ["\n--- Relevant Feedback & Research (retrieved) ---"];
    budget -= parts[0].length;

    for (const result of lexicalFiltered) {
      // Sanitize content to mitigate prompt injection
      const sanitized = result.content
        .replace(/---+/g, "—")  // prevent fake section headers
        .replace(/^(system|assistant|user)\s*:/gim, "[$1]:"); // neutralize role markers
      const entry = `\n[similarity: ${result.similarity.toFixed(2)}]\n${sanitized}`;
      if (entry.length > budget) break;
      parts.push(entry);
      budget -= entry.length;
    }

    return { context: parts.join("\n"), results: lexicalFiltered, qualityStats: stats };
  } catch (err) {
    // If embeddings API is unavailable (e.g. no API key), fail gracefully
    console.error("[rag] Retrieval failed, falling back to no RAG context:", err);
    return { context: "", results: [], qualityStats: emptyStats };
  }
}
