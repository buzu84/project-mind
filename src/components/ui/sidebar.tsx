"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  IconDashboard,
  IconProjects,
  IconChat,
  IconSettings,
  IconLogOut,
  IconSparkles,
} from "@/components/icons";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard },
  { href: "/projects", label: "Projects", icon: IconProjects },
  { href: "/ai-chat", label: "AI Assistant", icon: IconChat },
];

const bottomNav = [
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <IconSparkles className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-900">
          ProductMind
        </span>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 px-3 pt-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Menu
        </p>
        {mainNav.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-brand-50 text-brand-700 shadow-sm shadow-brand-100"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] flex-shrink-0 transition-colors",
                  active
                    ? "text-brand-600"
                    : "text-gray-400 group-hover:text-gray-600",
                )}
              />
              {item.label}
              {item.href === "/ai-chat" && (
                <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                  AI
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom navigation */}
      <div className="space-y-1 px-3 pb-2">
        {bottomNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] flex-shrink-0",
                  active ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* User section */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt=""
              className="h-9 w-9 rounded-full ring-2 ring-gray-100"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium text-gray-900">
              {session?.user?.name ?? "User"}
            </p>
            <p className="truncate text-xs text-gray-400">
              {session?.user?.email ?? ""}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            title="Sign out"
          >
            <IconLogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
