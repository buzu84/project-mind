import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import { createBreadcrumbJsonLd } from "@/lib/structured-data";
import { DeleteProjectButton } from "./delete-button";
import {
  IconDocument,
  IconTarget,
  IconTrendingUp,
  IconSparkles,
  IconArrowLeft,
  IconClock,
  IconChevronRight,
  IconSettings,
  IconUser,
  IconBarChart,
  IconChat,
} from "@/components/icons";

const tools = [
  {
    href: "context",
    label: "Context Builder",
    description: "Enrich your project with structured context for better AI answers",
    icon: IconDocument,
    color: "text-sky-600 bg-sky-50 group-hover:bg-sky-100",
  },
  {
    href: "chat",
    label: "AI Chat",
    description: "Chat with your AI product strategist about this project",
    icon: IconChat,
    color: "text-violet-600 bg-violet-50 group-hover:bg-violet-100",
  },
  {
    href: "prd",
    label: "PRD Generator",
    description: "Generate a comprehensive product requirements document",
    icon: IconDocument,
    color: "text-brand-600 bg-brand-50 group-hover:bg-brand-100",
  },
  {
    href: "prioritize",
    label: "Feature Prioritizer",
    description: "Score and rank features using the RICE framework",
    icon: IconTarget,
    color: "text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100",
  },
  {
    href: "analysis",
    label: "Competitive Analysis",
    description: "Analyze your competitive landscape and positioning",
    icon: IconTrendingUp,
    color: "text-amber-600 bg-amber-50 group-hover:bg-amber-100",
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

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "*, decisions(id, type, created_at), feature_ideas(count), messages(count), insights(count)"
    )
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  const decisions =
    (project.decisions as { id: string; type: string; created_at: string }[]) ??
    [];
  const featureCount =
    (project.feature_ideas as { count: number }[])?.[0]?.count ?? 0;
  const messageCount =
    (project.messages as { count: number }[])?.[0]?.count ?? 0;
  const insightCount =
    (project.insights as { count: number }[])?.[0]?.count ?? 0;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://productmind.app";
  const breadcrumb = createBreadcrumbJsonLd([
    { name: "Home", url: siteUrl },
    { name: "Projects", url: `${siteUrl}/projects` },
    { name: project.name, url: `${siteUrl}/projects/${project.id}` },
  ]);

  const details = [
    { label: "Target Users", value: project.target_users, icon: IconUser },
    { label: "Market", value: project.market, icon: IconBarChart },
    { label: "Business Model", value: project.business_model, icon: IconTrendingUp },
    { label: "Goals", value: project.goals, icon: IconTarget },
  ].filter((d) => d.value);

  return (
    <div className="mx-auto max-w-5xl">
      <JsonLd data={breadcrumb} />

      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-xl font-bold text-brand-600">
            {project.name[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
            {project.description && (
              <p className="mt-0.5 text-sm text-gray-500">{project.description}</p>
            )}
            <div className="mt-2 flex items-center gap-3">
              <Badge variant="info">{decisions.length} decisions</Badge>
              <Badge>{featureCount} features</Badge>
              <Badge variant="success">{insightCount} insights</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${project.id}/edit`}>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <IconSettings className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <DeleteProjectButton projectId={project.id} projectName={project.name} />
        </div>
      </div>

      {/* Project Details */}
      {details.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {details.map((d) => (
            <div
              key={d.label}
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <d.icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-400">{d.label}</p>
                <p className="mt-0.5 text-sm text-gray-700">{d.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Tools */}
      <div className="mt-8">
        <h3 className="mb-4 text-base font-semibold text-gray-900">AI Tools</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => (
            <Link key={tool.href} href={`/projects/${project.id}/${tool.href}`}>
              <Card className="group h-full cursor-pointer transition hover:border-gray-300 hover:shadow-md">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition ${tool.color}`}>
                  <tool.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-gray-900">{tool.label}</p>
                <p className="mt-1 text-xs text-gray-500">{tool.description}</p>
                <div className="mt-4 flex items-center text-xs font-medium text-brand-600 opacity-0 transition group-hover:opacity-100">
                  Get started
                  <IconChevronRight className="ml-1 h-3.5 w-3.5" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Decision history */}
      <div className="mt-10">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Decision History</h3>
        {decisions.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <IconSparkles className="h-6 w-6 text-gray-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-900">No decisions yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Use the AI tools above to generate your first decision
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {decisions.map((d) => (
              <Card key={d.id} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                    <IconSparkles className="h-4 w-4 text-gray-400" />
                  </div>
                  <Badge variant={decisionBadgeVariants[d.type]}>
                    {decisionTypeLabels[d.type]}
                  </Badge>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <IconClock className="h-3 w-3" />
                  {new Date(d.created_at).toLocaleDateString()}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
