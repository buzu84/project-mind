/**
 * Normalize raw AI-generated insights into a consistent shape.
 *
 * Handles:
 * - Raw array or object wrapper (insights, data, results, or first array property)
 * - camelCase / snake_case / alternate field names
 * - Markdown-fenced JSON
 * - String or number confidence values
 * - Unknown insight types (mapped to "opportunity" instead of dropped)
 */

const VALID_TYPES = new Set([
  "risk",
  "opportunity",
  "next_action",
  "roadmap",
  "assumption",
  "pain_point",
  "strategic_gap",
]);

const VALID_PRIORITIES = new Set(["critical", "high", "medium", "low"]);
const VALID_CONFIDENCES = new Set(["high", "medium", "low"]);

export interface NormalizedInsight {
  title: string;
  type: string;
  content: string;
  metadata: {
    priority: string;
    confidence: string;
    suggested_action: string;
  };
}

/**
 * Extract the insight array from a raw AI response string.
 */
function extractInsightArray(raw: string): unknown[] {
  // Strip markdown fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  if (Array.isArray(parsed)) return parsed;

  if (typeof parsed === "object" && parsed !== null) {
    // Try common keys, then fall back to first array-valued property
    const arr =
      parsed.insights ??
      parsed.data ??
      parsed.results ??
      parsed.strategic_insights ??
      parsed.items ??
      Object.values(parsed).find((v) => Array.isArray(v));
    if (Array.isArray(arr)) return arr;
  }

  return [];
}

/**
 * Get a text value from an object trying multiple possible keys.
 */
function pickText(obj: any, ...keys: string[]): string {
  for (const k of keys) {
    if (typeof obj[k] === "string" && obj[k].length > 0) return obj[k];
  }
  return "";
}

/**
 * Normalize a confidence value to "high" | "medium" | "low".
 */
function normalizeConfidence(v: unknown): string {
  if (typeof v === "string") {
    const lower = v.toLowerCase();
    if (VALID_CONFIDENCES.has(lower)) return lower;
  }
  if (typeof v === "number") {
    const n = v > 1 ? v / 100 : v; // 0-100 → 0-1
    if (n >= 0.7) return "high";
    if (n >= 0.4) return "medium";
    return "low";
  }
  return "medium";
}

/**
 * Normalize raw AI response string into NormalizedInsight[].
 * Never throws — returns empty array on failure.
 */
export function normalizeInsightsFromAI(raw: string): {
  insights: NormalizedInsight[];
  rawParsedCount: number;
  error?: string;
} {
  let items: unknown[];
  try {
    items = extractInsightArray(raw);
  } catch (err) {
    return {
      insights: [],
      rawParsedCount: 0,
      error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const rawParsedCount = items.length;

  const insights: NormalizedInsight[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;

    const title = pickText(obj, "title", "headline", "name");
    const explanation = pickText(
      obj,
      "explanation",
      "content",
      "description",
      "detail",
      "details",
      "reasoning",
      "summary",
      "body",
      "text",
    );

    // Skip only if there's truly no usable content
    if (!title && !explanation) continue;

    const rawType = typeof obj.type === "string" ? obj.type.toLowerCase().trim() : "";
    const type = VALID_TYPES.has(rawType) ? rawType : "opportunity";

    const rawPriority = typeof obj.priority === "string" ? obj.priority.toLowerCase().trim() : "";
    const priority = VALID_PRIORITIES.has(rawPriority) ? rawPriority : "medium";

    const confidence = normalizeConfidence(obj.confidence);

    const suggestedAction = pickText(
      obj,
      "suggested_action",
      "suggestedAction",
      "action",
      "next_step",
      "nextStep",
      "recommendation",
    );

    insights.push({
      title: (title || explanation.slice(0, 80)).slice(0, 200),
      type,
      content: explanation || title,
      metadata: {
        priority,
        confidence,
        suggested_action: suggestedAction,
      },
    });
  }

  return { insights, rawParsedCount };
}


