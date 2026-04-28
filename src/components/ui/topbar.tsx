"use client";

import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/client";
import { IconSearch, IconBell } from "@/components/icons";

function getBreadcrumb(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const map: Record<string, string> = {
    dashboard: "Dashboard",
    projects: "Projects",
    "ai-chat": "AI Assistant",
    settings: "Settings",
    prd: "PRD Generator",
    prioritize: "Feature Prioritizer",
    analysis: "Competitive Analysis",
    chat: "AI Chat",
    edit: "Edit Project",
  };
  const last = segments[segments.length - 1];
  return map[last ?? ""] ?? "Dashboard";
}

export function TopBar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const pageTitle = getBreadcrumb(pathname);

  const displayName = user?.name ?? "U";
  const avatarUrl = user?.avatar_url;

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 w-64">
          <IconSearch className="h-4 w-4" />
          <span>Search…</span>
          <kbd className="ml-auto rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
          <IconBell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500" />
        </button>

        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="ml-1 h-8 w-8 rounded-full ring-2 ring-gray-100"
          />
        ) : (
          <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {displayName[0]?.toUpperCase() ?? "U"}
          </div>
        )}
      </div>
    </header>
  );
}
