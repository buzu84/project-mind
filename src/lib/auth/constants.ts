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
 */
export function isDevMode(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  // Default to true in development unless explicitly disabled
  return process.env.USE_MOCK_AUTH !== "false";
}

