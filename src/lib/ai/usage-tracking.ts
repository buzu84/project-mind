/**
 * AI usage tracking service.
 * Records every AI operation for cost monitoring and analytics.
 * Never throws — tracking failures are logged but don't break AI features.
 */
import { createClient } from "@/lib/supabase/server";
import { calculateAICost } from "./pricing";
import type { TrackAIUsageInput, AIUsageFeature, AIUsageSummary } from "./usage-types";

/**
 * Sanitize error messages to avoid leaking API keys or raw provider secrets.
 */
function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Strip anything that looks like an API key (sk-..., key-..., Bearer ...)
  return raw
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "[REDACTED_KEY]")
    .replace(/key-[A-Za-z0-9_-]{10,}/g, "[REDACTED_KEY]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .slice(0, 500);
}

/**
 * Record an AI usage event. Safe to call fire-and-forget.
 */
export async function trackAIUsage(input: TrackAIUsageInput): Promise<void> {
  try {
    const cost = input.isMock
      ? { inputCost: 0, outputCost: 0, totalCost: 0, currency: "USD" }
      : calculateAICost({
          provider: input.provider ?? "openai",
          model: input.model,
          promptTokens: input.promptTokens,
          completionTokens: input.completionTokens,
        });

    const row = {
      user_id: input.userId,
      project_id: input.projectId ?? null,
      provider: input.provider ?? "openai",
      model: input.model,
      feature: input.feature,
      prompt_tokens: input.promptTokens,
      completion_tokens: input.completionTokens,
      total_tokens: input.promptTokens + input.completionTokens,
      input_cost: cost.inputCost,
      output_cost: cost.outputCost,
      estimated_cost: cost.totalCost,
      currency: cost.currency,
      is_mock: input.isMock,
      status: input.status ?? "success",
      error_message: input.errorMessage ?? null,
      latency_ms: input.latencyMs ?? null,
      metadata: input.metadata ?? null,
    };

    const supabase = createClient();
    const { error } = await supabase.from("ai_usage").insert(row);
    if (error) {
      console.error("[AI_USAGE_TRACK_ERROR]", { feature: input.feature, error: error.message });
    }
  } catch (err) {
    console.error("[AI_USAGE_TRACK_ERROR]", { feature: input.feature, error: err instanceof Error ? err.message : err });
  }
}

/**
 * Record a failed AI usage event. Convenience wrapper around trackAIUsage.
 * Never throws.
 */
export async function trackAIUsageError(input: {
  userId: string;
  projectId?: string | null;
  feature: AIUsageFeature;
  model: string;
  error: unknown;
  latencyMs?: number | null;
  provider?: "openai";
  isMock?: boolean;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  return trackAIUsage({
    userId: input.userId,
    projectId: input.projectId,
    provider: input.provider ?? "openai",
    model: input.model,
    feature: input.feature,
    promptTokens: 0,
    completionTokens: 0,
    isMock: input.isMock ?? false,
    status: "error",
    errorMessage: sanitizeErrorMessage(input.error),
    latencyMs: input.latencyMs,
    metadata: input.metadata,
  });
}

/**
 * Extract token usage from an OpenAI chat completion response.
 */
export function extractTokenUsage(response: {
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
}): { promptTokens: number; completionTokens: number } {
  return {
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
  };
}

/**
 * Get usage summary for the current month.
 */
export async function getMonthlyUsageSummary(userId: string, existingClient?: ReturnType<typeof createClient>): Promise<AIUsageSummary> {
  try {
    const supabase = existingClient ?? createClient();
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { data: rows } = await supabase
      .from("ai_usage")
      .select("feature, total_tokens, estimated_cost, is_mock, status, created_at")
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString())
      .order("created_at", { ascending: false });

    // Filter success status in JS to avoid missing rows due to case/null mismatch
    type UsageQueryRow = { feature: string; total_tokens: number; estimated_cost: number; is_mock: boolean; status: string; created_at: string };
    const list = ((rows ?? []) as UsageQueryRow[]).filter((r) => !r.status || r.status === "success");

    if (list.length === 0) {
      return { totalRequests: 0, totalTokens: 0, estimatedCost: 0, topFeature: null, allMock: true };
    }

    const totalRequests = list.length;
    const totalTokens = list.reduce((sum, r) => sum + (Number(r.total_tokens) || 0), 0);
    const estimatedCost = list.reduce((sum, r) => sum + (Number(r.estimated_cost) || 0), 0);
    const allMock = list.every((r) => r.is_mock);

    // Find most used feature
    const featureCounts: Record<string, number> = {};
    for (const r of list) {
      featureCounts[r.feature] = (featureCounts[r.feature] ?? 0) + 1;
    }
    const topFeature = Object.entries(featureCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return { totalRequests, totalTokens, estimatedCost, topFeature, allMock };
  } catch {
    return { totalRequests: 0, totalTokens: 0, estimatedCost: 0, topFeature: null, allMock: true };
  }
}
