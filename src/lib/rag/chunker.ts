/**
 * Splits a document into overlapping chunks for embedding.
 *
 * Strategy: paragraph-aware splitting with a target chunk size.
 * Keeps chunks semantically coherent by splitting on paragraph boundaries
 * and adding overlap so context isn't lost at boundaries.
 */

export interface DocumentChunk {
  content: string;
  tokenCount: number;
  index: number;
}

const AVG_CHARS_PER_TOKEN = 4;
const DEFAULT_CHUNK_SIZE = 500; // tokens
const DEFAULT_CHUNK_OVERLAP = 50; // tokens

/**
 * Estimate token count from character length.
 * Uses the ~4 chars/token heuristic for English text.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN);
}

/**
 * Split text into chunks with overlap.
 *
 * @param text - Full document text
 * @param chunkSize - Target chunk size in tokens (default 500)
 * @param overlap - Overlap between chunks in tokens (default 50)
 * @returns Array of document chunks with estimated token counts
 */
export function chunkDocument(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): DocumentChunk[] {
  if (!text.trim()) return [];

  const maxChars = chunkSize * AVG_CHARS_PER_TOKEN;
  const overlapChars = overlap * AVG_CHARS_PER_TOKEN;

  // Split into paragraphs first for semantic coherence
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());

  const chunks: DocumentChunk[] = [];
  let current = "";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();

    // If a single paragraph exceeds max, split it by sentences
    if (trimmed.length > maxChars) {
      // Flush current buffer first
      if (current.trim()) {
        chunks.push({
          content: current.trim(),
          tokenCount: estimateTokens(current.trim()),
          index: chunkIndex++,
        });
        // Keep overlap from end of current
        current = current.trim().slice(-overlapChars);
      }

      // Split long paragraph by sentences
      const sentences = trimmed.match(/[^.!?]+[.!?]+\s*/g) || [trimmed];
      for (const sentence of sentences) {
        if ((current + sentence).length > maxChars && current.trim()) {
          chunks.push({
            content: current.trim(),
            tokenCount: estimateTokens(current.trim()),
            index: chunkIndex++,
          });
          current = current.trim().slice(-overlapChars) + sentence;
        } else {
          current += sentence;
        }
      }
      continue;
    }

    // Check if adding this paragraph exceeds chunk size
    const candidate = current ? current + "\n\n" + trimmed : trimmed;
    if (candidate.length > maxChars && current.trim()) {
      chunks.push({
        content: current.trim(),
        tokenCount: estimateTokens(current.trim()),
        index: chunkIndex++,
      });
      // Start new chunk with overlap from end of previous
      current = current.trim().slice(-overlapChars) + "\n\n" + trimmed;
    } else {
      current = candidate;
    }
  }

  // Flush remaining
  if (current.trim()) {
    chunks.push({
      content: current.trim(),
      tokenCount: estimateTokens(current.trim()),
      index: chunkIndex++,
    });
  }

  return chunks;
}
