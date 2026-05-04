"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import type { AppUser } from "@/lib/auth/constants";

interface MobileNavProps {
  user?: AppUser | null;
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-3 top-4 z-40 rounded-lg border border-gray-200 bg-white p-2 shadow-sm"
        aria-label="Open navigation menu"
      >
        <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay + Sidebar drawer */}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="fixed inset-y-0 left-0 z-50 w-64">
            <div onClick={() => setOpen(false)}>
              <Sidebar user={user} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
