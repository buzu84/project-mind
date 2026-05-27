import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { IconArrowLeft } from "@/components/icons";
import { InsightsClient } from "./insights-client";

import type { Tables, Json } from "@/lib/supabase/types";
import { parseInsightMetadata, type ParsedInsightMetadata } from "@/lib/validation/json-parsers";

export const dynamic = "force-dynamic";

// DB row — metadata is Json | null
type InsightRow = Tables<"insights">;

// View-model for UI — narrows metadata to expected shape
export interface Insight extends Omit<InsightRow, "metadata"> {
  metadata: ParsedInsightMetadata | null;
}

export default async function InsightsPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const supabase = createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  const { data: insights } = await supabase
    .from("insights")
    .select("id, type, title, content, metadata, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to {project.name}
      </Link>

      <InsightsClient
        projectId={project.id}
        projectName={project.name}
        initialInsights={(insights ?? []).map((row: { id: string; type: string; title: string; content: string; metadata: Json | null; created_at: string }) => ({
          ...row,
          metadata: parseInsightMetadata(row.metadata),
        }))}
      />
    </div>
  );
}
