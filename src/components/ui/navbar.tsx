"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { UserDropdown } from "@/components/ui/user-dropdown";
import type { AppUser } from "@/lib/auth/constants";

interface NavbarProps {
  user?: AppUser | null;
}

export function Navbar({ user: initialUser }: NavbarProps) {
  const { user, loading } = useCurrentUser(initialUser);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <Link href="/" className="text-xl font-bold text-brand-700">
        ProductMind
      </Link>

      <div className="flex items-center gap-4">
        {!mounted ? null : !loading && user ? (
          <>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <UserDropdown user={user} />
          </>
        ) : !loading ? (
          <>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Log in
            </Link>
            <Link href="/sign-up">
              <Button>Start free</Button>
            </Link>
          </>
        ) : null}
      </div>
    </nav>
  );
}
