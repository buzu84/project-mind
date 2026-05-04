import { createClient } from "@/lib/supabase/server";
import { isDevMode, DEV_USER, type AppUser } from "./constants";

/**
 * Get the current authenticated user (server-side).
 *
 * - In development: returns a mock user (no Supabase session required).
 * - In production: fetches the real user from Supabase Auth.
 *
 * Works in server components, API routes, and server actions.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  if (isDevMode()) {
    return DEV_USER;
  }

  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "",
    avatar_url: user.user_metadata?.avatar_url ?? null,
  };
}

/**
 * Require an authenticated user or throw.
 * Use in server actions and API routes where auth is mandatory.
 */
export async function requireCurrentUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
