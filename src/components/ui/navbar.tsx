"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <Link href="/" className="text-xl font-bold text-brand-700">
        ProductMind
      </Link>

      <div className="flex items-center gap-4">
        {status === "authenticated" ? (
          <>
            <Link
              href="/projects"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
            {session.user?.image && (
              <img
                src={session.user.image}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            )}
          </>
        ) : (
          <>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link href="/sign-in">
              <Button>Get Started</Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

