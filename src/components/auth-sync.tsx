"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDevMode } from "@/lib/auth/constants";

/**
 * Listens for Supabase auth state changes across browser tabs.
 * When a user signs out in one tab, all other tabs redirect to /sign-in.
 * Only active in real auth mode (not dev mock).
 */
export function AuthSync() {
  const router = useRouter();

  useEffect(() => {
    if (isDevMode()) return;

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_OUT") {
        router.push("/");
        router.refresh();
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}


