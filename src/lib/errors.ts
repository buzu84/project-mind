/**
 * Shared error formatting utilities.
 * Never returns "[object Object]", never exposes API keys.
 */

/**
 * Convert any error value to a user-friendly string.
 */
export function getFriendlyErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    // Detect OpenAI auth errors
    if (msg.includes("401") || msg.includes("Incorrect API key") || msg.includes("invalid_api_key")) {
      return "AI is not configured. Set OPENAI_API_KEY or use mock mode.";
    }
    // Detect rate limit
    if (msg.includes("429") || msg.includes("Rate limit")) {
      return "AI rate limit reached. Please try again in a moment.";
    }
    // Detect timeout
    if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
      return "AI request timed out. Please try again.";
    }
    // Strip API keys
    return sanitize(msg);
  }

  if (typeof err === "string") return sanitize(err);

  // Handle objects (e.g. Zod flatten output)
  if (err && typeof err === "object") {
    // Try to extract a message field
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string") return sanitize(obj.message);
    if (typeof obj.error === "string") return sanitize(obj.error);
    // Flatten field errors
    if (obj.fieldErrors && typeof obj.fieldErrors === "object") {
      const fields = obj.fieldErrors as Record<string, string[]>;
      const msgs = Object.entries(fields)
        .filter(([, v]) => Array.isArray(v) && v.length > 0)
        .map(([k, v]) => `${k}: ${v[0]}`)
        .join(", ");
      return msgs || "Validation failed.";
    }
    return "An unexpected error occurred.";
  }

  return "An unexpected error occurred.";
}

function sanitize(msg: string): string {
  return msg
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "[REDACTED]")
    .replace(/key-[A-Za-z0-9_-]{10,}/g, "[REDACTED]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .slice(0, 500);
}

