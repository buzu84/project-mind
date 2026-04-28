"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isDevMode, DEV_USER, type AppUser } from "./constants";

/**
 * React hook to get the current authenticated user (client-side).
 *
 * - In development: returns a mock user immediately.
 * - In production: fetches from Supabase Auth.
 */
export function useCurrentUser(): {
  user: AppUser | null;
  loading: boolean;
} {
  const [user, setUser] = useState<AppUser | null>(
    isDevMode() ? DEV_USER : null,
  );
  const [loading, setLoading] = useState(!isDevMode());

  useEffect(() => {
    if (isDevMode()) {
      console.debug("[auth] Using mock auth — returning dev user");
      return;
    }

    console.debug("[auth] Using Supabase auth — fetching session...");
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
  }, []);

  return { user, loading };
}

