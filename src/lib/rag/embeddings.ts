import { openai } from "@/lib/openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_BATCH_SIZE = 100;

/**
 * Generate an embedding vector for a single text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.replace(/\n/g, " ").trim();
  if (!input) throw new Error("Cannot embed empty text");

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batches.
 * OpenAI supports up to 2048 inputs per request; we batch at 100 for safety.
 */
export async function generateEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts
      .slice(i, i + MAX_BATCH_SIZE)
      .map((t) => t.replace(/\n/g, " ").trim());

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    // Sort by index to maintain order
    const sorted = response.data.sort((a, b) => a.index - b.index);
    results.push(...sorted.map((d) => d.embedding));
  }

  return results;
}
