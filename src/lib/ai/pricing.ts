/**
 * AI model pricing configuration.
 *
 * ⚠️  IMPORTANT: These are estimated prices as of April 2026.
 *     Update manually when providers change pricing.
 *     Prices are per 1 million tokens in USD.
 *     Source: https://openai.com/pricing
 */
import type { AIModelPricing, AICostBreakdown, AIProvider } from "./usage-types";

const MODEL_PRICING: AIModelPricing[] = [
  // GPT-4o
  { provider: "openai", model: "gpt-4o", inputCostPer1MTokens: 2.50, outputCostPer1MTokens: 10.00 },
  { provider: "openai", model: "gpt-4o-2024-08-06", inputCostPer1MTokens: 2.50, outputCostPer1MTokens: 10.00 },
  // GPT-4o mini
  { provider: "openai", model: "gpt-4o-mini", inputCostPer1MTokens: 0.15, outputCostPer1MTokens: 0.60 },
  { provider: "openai", model: "gpt-4o-mini-2024-07-18", inputCostPer1MTokens: 0.15, outputCostPer1MTokens: 0.60 },
  // GPT-4 Turbo
  { provider: "openai", model: "gpt-4-turbo", inputCostPer1MTokens: 10.00, outputCostPer1MTokens: 30.00 },
  // GPT-3.5 Turbo
  { provider: "openai", model: "gpt-3.5-turbo", inputCostPer1MTokens: 0.50, outputCostPer1MTokens: 1.50 },
  // Embeddings
  { provider: "openai", model: "text-embedding-3-small", inputCostPer1MTokens: 0.02, outputCostPer1MTokens: 0 },
  { provider: "openai", model: "text-embedding-3-large", inputCostPer1MTokens: 0.13, outputCostPer1MTokens: 0 },
  { provider: "openai", model: "text-embedding-ada-002", inputCostPer1MTokens: 0.10, outputCostPer1MTokens: 0 },
];

// Fallback pricing for unknown models
const FALLBACK_PRICING: AIModelPricing = {
  provider: "openai",
  model: "unknown",
  inputCostPer1MTokens: 5.00,
  outputCostPer1MTokens: 15.00,
};

function findPricing(provider: AIProvider, model: string): AIModelPricing {
  return (
    MODEL_PRICING.find(
      (p) => p.provider === provider && p.model === model,
    ) ??
    // Try partial match (e.g. "gpt-4o-2025-01-01" matches "gpt-4o").
    // Sort candidates by model name length descending so "gpt-4o-mini"
    // is preferred over "gpt-4o" for "gpt-4o-mini-2025-…" inputs.
    [...MODEL_PRICING]
      .filter((p) => p.provider === provider && model.startsWith(p.model))
      .sort((a, b) => b.model.length - a.model.length)[0] ??
    FALLBACK_PRICING
  );
}

export function calculateAICost({
  provider = "openai",
  model,
  promptTokens,
  completionTokens,
}: {
  provider?: AIProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
}): AICostBreakdown {
  const pricing = findPricing(provider, model);
  const inputCost = (promptTokens / 1_000_000) * pricing.inputCostPer1MTokens;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputCostPer1MTokens;

  return {
    inputCost: Math.round(inputCost * 1_000_000) / 1_000_000,
    outputCost: Math.round(outputCost * 1_000_000) / 1_000_000,
    totalCost: Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000,
    currency: "USD",
  };
}

