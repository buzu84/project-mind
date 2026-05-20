import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconProjects,
  IconDocument,
  IconSparkles,
  IconChevronRight,
  IconClock,
  IconTrendingUp,
  IconPlus,
  IconBookOpen,
} from "@/components/icons";
import { getMonthlyUsageSummary } from "@/lib/ai/usage-tracking";
import { FEATURE_LABELS } from "@/lib/ai/usage-types";
import type { AIUsageFeature } from "@/lib/ai/usage-types";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const supabase = createClient();

  const [projectsRes, decisionsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, description, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("decisions")
      .select("id, type, created_at, project_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const recentProjects = (projectsRes.data ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    updated_at: string;
  }>;
  const recentDecisions = (decisionsRes.data ?? []) as unknown as Array<{
    id: string;
    type: string;
    created_at: string;
    project_id: string | null;
  }>;

  // Count totals
  const { count: projectCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  const { count: decisionCount } = await supabase
    .from("decisions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const usageSummary = await getMonthlyUsageSummary(user.id, supabase);

  const displayName = user.name ?? user.email?.split("@")[0] ?? "";

  const stats = [
    {
      label: "Total Projects",
      value: projectCount ?? 0,
      icon: IconProjects,
      color: "text-brand-600 bg-brand-50",
    },
    {
      label: "AI Decisions",
      value: decisionCount ?? 0,
      icon: IconSparkles,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "PRDs Generated",
      value: recentDecisions.filter((d) => d.type === "PRD").length,
      icon: IconDocument,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Analyses Run",
      value: recentDecisions.filter(
        (d) => d.type === "COMPETITIVE_ANALYSIS"
      ).length,
      icon: IconTrendingUp,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  const decisionTypeLabels: Record<string, string> = {
    PRD: "PRD",
    PRIORITIZATION: "Prioritization",
    COMPETITIVE_ANALYSIS: "Analysis",
  };

  const decisionBadgeVariants: Record<string, "info" | "success" | "warning"> = {
    PRD: "info",
    PRIORITIZATION: "success",
    COMPETITIVE_ANALYSIS: "warning",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back{displayName ? `, ${displayName.split(" ")[0]}` : ""}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s what&apos;s happening with your products today.
        </p>
      </div>

      {/* Onboarding CTA — shown only for new users */}
      {(projectCount ?? 0) === 0 && (
        <Link href="/getting-started" className="group block">
          <Card className="flex items-center gap-4 border-brand-200 bg-brand-50 transition hover:border-brand-300 hover:shadow-md">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 transition group-hover:bg-brand-200">
              <IconBookOpen className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-brand-900">New to ProductMind?</p>
              <p className="text-xs text-brand-700">
                Learn the recommended workflow and how to get the best AI outputs from your project context.
              </p>
            </div>
            <span className="hidden flex-shrink-0 text-xs font-medium text-brand-600 sm:block">
              5 min overview →
            </span>
          </Card>
        </Link>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex items-center gap-4 py-5">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}
            >
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent projects */}
        <Card className="lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              Recent Projects
            </h3>
            <Link
              href="/projects"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View all →
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <IconProjects className="h-6 w-6 text-gray-400" />
              </div>
              <p className="mt-3 text-sm text-gray-500">No projects yet</p>
              <Link
                href="/projects"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <IconPlus className="h-3.5 w-3.5" />
                Create your first project
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group flex items-center justify-between rounded-lg px-3 py-3 transition hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600">
                      {project.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {project.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        Updated{" "}
                        <time suppressHydrationWarning dateTime={project.updated_at}>
                          {new Date(project.updated_at).toLocaleDateString()}
                        </time>
                      </p>
                    </div>
                  </div>
                  <IconChevronRight className="h-4 w-4 text-gray-300 transition group-hover:text-gray-500" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <h3 className="mb-5 text-base font-semibold text-gray-900">
            Recent Activity
          </h3>

          {recentDecisions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <IconClock className="h-6 w-6 text-gray-400" />
              </div>
              <p className="mt-3 text-sm text-gray-500">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentDecisions.map((decision) => (
                <div key={decision.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <IconSparkles className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">
                      <Badge variant={decisionBadgeVariants[decision.type]}>
                        {decisionTypeLabels[decision.type]}
                      </Badge>
                      <span className="ml-2 text-gray-500">in</span>{" "}
                      <span className="font-medium">
                        Project
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      <time suppressHydrationWarning dateTime={decision.created_at}>
                        {new Date(decision.created_at).toLocaleDateString()}
                      </time>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        {/* AI Usage This Month */}
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              AI Usage This Month
            </h3>
            {usageSummary.allMock && usageSummary.totalRequests > 0 && (
              <Badge variant="warning">Mock Mode</Badge>
            )}
            {!usageSummary.allMock && usageSummary.totalRequests > 0 && (
              <Badge variant="success">Live</Badge>
            )}
          </div>

          {usageSummary.totalRequests === 0 ? (
            <div className="text-sm text-gray-500">
              <p>No AI usage recorded this month.</p>
              <Link
                href="/usage"
                className="mt-1 inline-block text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                View all usage history →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${usageSummary.estimatedCost.toFixed(4)}
                </p>
                <p className="text-xs text-gray-500">Estimated Cost</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {usageSummary.totalRequests}
                </p>
                <p className="text-xs text-gray-500">AI Requests</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {usageSummary.totalTokens.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Total Tokens</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {usageSummary.topFeature
                    ? FEATURE_LABELS[usageSummary.topFeature as AIUsageFeature] ??
                      usageSummary.topFeature
                    : "—"}
                </p>
                <p className="text-xs text-gray-500">Top Feature</p>
              </div>
            </div>
          )}
        </Card>

        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Quick Actions
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "New Project",
              description: "Start a new product project",
              href: "/projects",
              icon: IconPlus,
              color: "text-brand-600 bg-brand-50 group-hover:bg-brand-100",
            },
            {
              label: "Generate PRD",
              description: "Create a product requirements doc",
              href: "/projects",
              icon: IconDocument,
              color: "text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100",
            },
            {
              label: "AI Assistant",
              description: "Chat with your AI product advisor",
              href: "/ai-chat",
              icon: IconSparkles,
              color: "text-violet-600 bg-violet-50 group-hover:bg-violet-100",
            },
          ].map((action) => (
            <Link key={action.label} href={action.href}>
              <Card className="group cursor-pointer transition hover:border-gray-300 hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${action.color}`}
                  >
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

