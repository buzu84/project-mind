/**
 * Determine whether to use real AI (OpenAI) or mock responses.
 *
 * - USE_REAL_AI=false  → mock
 * - USE_REAL_AI=true   → real
 * - unset              → real if OPENAI_API_KEY exists
 */
export function isRealAI(): boolean {
  if (process.env.NODE_ENV === "production") return true; // Never mock in production
  if (process.env.USE_REAL_AI === "false") return false;
  if (process.env.USE_REAL_AI === "true") return true;
  return !!process.env.OPENAI_API_KEY;
}

