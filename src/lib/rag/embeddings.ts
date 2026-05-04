import { openai } from "@/lib/openai";
import { trackAIUsage, trackAIUsageError } from "@/lib/ai/usage-tracking";
import type { AIUsageFeature } from "@/lib/ai/usage-types";

const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_BATCH_SIZE = 100;

/** Optional tracking context passed by callers that have userId/projectId. */
export interface EmbeddingTrackingContext {
  userId: string;
  projectId?: string | null;
  feature: AIUsageFeature;
}

/**
 * Generate an embedding vector for a single text.
 */
export async function generateEmbedding(
  text: string,
  tracking?: EmbeddingTrackingContext,
): Promise<number[]> {
  const input = text.replace(/\n/g, " ").trim();
  if (!input) throw new Error("Cannot embed empty text");

  const startTime = Date.now();

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input,
    });

    if (tracking) {
      const promptTokens = response.usage?.prompt_tokens ?? Math.ceil(input.length / 4);
      void trackAIUsage({
        userId: tracking.userId,
        projectId: tracking.projectId,
        model: EMBEDDING_MODEL,
        feature: tracking.feature,
        promptTokens,
        completionTokens: 0,
        isMock: false,
        latencyMs: Date.now() - startTime,
      });
    }

    return response.data[0].embedding;
  } catch (err) {
    if (tracking) {
      void trackAIUsageError({
        userId: tracking.userId,
        projectId: tracking.projectId,
        feature: tracking.feature,
        model: EMBEDDING_MODEL,
        error: err,
        latencyMs: Date.now() - startTime,
      });
    }
    throw err;
  }
}

/**
 * Generate embeddings for multiple texts in batches.
 * OpenAI supports up to 2048 inputs per request; we batch at 100 for safety.
 */
export async function generateEmbeddings(
  texts: string[],
  tracking?: EmbeddingTrackingContext,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const results: number[][] = [];
  let totalPromptTokens = 0;
  const startTime = Date.now();

  try {
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts
        .slice(i, i + MAX_BATCH_SIZE)
        .map((t) => t.replace(/\n/g, " ").trim());

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
      });

      totalPromptTokens += response.usage?.prompt_tokens ?? batch.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0);

      // Sort by index to maintain order
      const sorted = response.data.sort((a, b) => a.index - b.index);
      results.push(...sorted.map((d) => d.embedding));
    }

    if (tracking) {
      void trackAIUsage({
        userId: tracking.userId,
        projectId: tracking.projectId,
        model: EMBEDDING_MODEL,
        feature: tracking.feature,
        promptTokens: totalPromptTokens,
        completionTokens: 0,
        isMock: false,
        latencyMs: Date.now() - startTime,
        metadata: { chunks: texts.length },
      });
    }

    return results;
  } catch (err) {
    if (tracking) {
      void trackAIUsageError({
        userId: tracking.userId,
        projectId: tracking.projectId,
        feature: tracking.feature,
        model: EMBEDDING_MODEL,
        error: err,
        latencyMs: Date.now() - startTime,
        metadata: { chunks: texts.length },
      });
    }
    throw err;
  }
}
