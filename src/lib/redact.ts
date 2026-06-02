/**
 * Shared secret-redaction utility.
 *
 * Strips API keys and auth tokens from strings before they are
 * persisted to the database or shown to users.
 *
 * Patterns:
 * - sk-…  (OpenAI keys)
 * - key-… (generic API keys)
 * - Bearer … (auth headers)
 *
 * Output is truncated to 500 characters.
 */
export function redactSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "[REDACTED]")
    .replace(/key-[A-Za-z0-9_-]{10,}/g, "[REDACTED]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .slice(0, 500);
}

