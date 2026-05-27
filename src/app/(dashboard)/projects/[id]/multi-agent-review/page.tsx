import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { IconArrowLeft } from "@/components/icons";
import { MultiAgentClient } from "./multi-agent-client";
import { parseMultiAgentReviewRow } from "@/lib/validation/json-parsers";

export default async function MultiAgentReviewPage({
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

  const { data: reviews } = await supabase
    .from("multi_agent_reviews")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to {project.name}
      </Link>

      <MultiAgentClient
        projectId={project.id}
        projectName={project.name}
        initialReviews={(reviews ?? []).map((r: Record<string, unknown>) => parseMultiAgentReviewRow(r))}
      />
    </div>
  );
}

