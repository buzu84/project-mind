"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scrolls to a hash target when the route changes or the page loads with a hash.
 * Needed because Next.js App Router does not auto-scroll to hash fragments
 * on client-side navigations (including browser Back/Forward).
 */
export function HashScrollHandler() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    });
  }, [pathname]);

  return null;
}
