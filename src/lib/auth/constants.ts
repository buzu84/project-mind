/**
 * Shared auth types used by both server and client auth modules.
 */
export interface AppUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export const DEV_USER: AppUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "dev@productmind.app",
  name: "Dev User",
  avatar_url: null,
};

/**
 * Returns true when mock auth should be used.
 * Safety: NEVER enabled in production, even if USE_MOCK_AUTH is set.
 * Requires explicit USE_MOCK_AUTH=true to activate.
 * Uses NEXT_PUBLIC_ prefix so the value is consistent on server and client.
 */
export function isDevMode(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  // Check both prefixed (client-safe) and non-prefixed (server-only) env vars
  const mockAuth =
    process.env.NEXT_PUBLIC_USE_MOCK_AUTH ?? process.env.USE_MOCK_AUTH;
  return mockAuth === "true";
}

/**
 * Returns true when in-memory mock DB should be used instead of real Supabase.
 * Only enabled when USE_MOCK_DB is explicitly "true" AND not in production.
 */
export function isMockDb(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  return process.env.USE_MOCK_DB === "true";
}

