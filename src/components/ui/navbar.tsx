"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <Link href="/" className="text-xl font-bold text-brand-700">
        ProductMind
      </Link>

      <div className="flex items-center gap-4">
        {!loading && user ? (
          <>
            <Link
              href="/projects"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            )}
          </>
        ) : !loading ? (
          <>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </>
        ) : null}
      </div>
    </nav>
  );
}
