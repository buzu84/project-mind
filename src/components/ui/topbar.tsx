"use client";

import { usePathname } from "next/navigation";
import type { AppUser } from "@/lib/auth/constants";
import { UserDropdown } from "@/components/ui/user-dropdown";

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  "ai-chat": "AI Assistant",
  settings: "Settings",
  usage: "AI Usage",
  prd: "PRD Generator",
  prioritize: "Feature Prioritizer",
  analysis: "Competitive Analysis",
  chat: "Project Chat",
  edit: "Edit Project",
  feedback: "Feedback & Research",
  insights: "AI Insights",
  roadmap: "Product Roadmap",
  features: "Feature Ideas",
  "multi-agent-review": "Multi-Agent Review",
  context: "Project Context",
  "getting-started": "Getting Started",
  new: "New Project",
};

function getBreadcrumb(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);

  // Walk segments from the end, skip UUIDs, find first meaningful segment
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    // Skip UUID-like segments
    if (/^[0-9a-f-]{20,}$/i.test(seg)) continue;
    if (PAGE_TITLES[seg]) return PAGE_TITLES[seg];
  }

  return "Dashboard";
}

interface TopBarProps {
  user?: AppUser | null;
}

export function TopBar({ user }: TopBarProps) {
  const pathname = usePathname();
  const pageTitle = getBreadcrumb(pathname);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white pl-14 pr-4 md:px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-2">
        {user && <UserDropdown user={user} />}
      </div>
    </header>
  );
}
