"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

/**
 * Shows a toast when user was redirected from an auth page
 * because they were already signed in. Cleans up the query param.
 */
export function AuthRedirectToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get("from") === "already-authenticated") {
      toast("You're already signed in", "info");
      // Remove the query param without full navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("from");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams, toast, router]);

  return null;
}

