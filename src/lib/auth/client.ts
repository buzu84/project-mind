"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isDevMode, DEV_USER, type AppUser } from "./constants";

/**
 * Client-side hook for current user.
 *
 * Accepts an optional `initialUser` from the server to prevent
 * hydration mismatches. If provided, the hook uses it as the initial
 * state and skips the redundant client-side fetch.
 */
export function useCurrentUser(initialUser?: AppUser | null): {
  user: AppUser | null;
  loading: boolean;
} {
  const resolvedInitial = initialUser ?? (isDevMode() ? DEV_USER : null);
  const [user, setUser] = useState<AppUser | null>(resolvedInitial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we already have a user (from server or dev mode), skip fetch
    if (resolvedInitial || isDevMode()) return;

    // No initial user and not dev mode — fetch client-side as fallback
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? "",
          name:
            data.user.user_metadata?.full_name ??
            data.user.email?.split("@")[0] ??
            "",
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
        });
      }
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { user, loading };
}
