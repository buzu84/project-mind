"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { href: "/projects", label: "Projects", icon: "📁" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <Link href="/projects" className="text-lg font-bold text-brand-700">
          ProductMind
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          {session?.user?.image && (
            <img
              src={session.user.image}
              alt=""
              className="h-8 w-8 rounded-full"
            />
          )}
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium text-gray-900">
              {session?.user?.name}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-3 w-full rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

