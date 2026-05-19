import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { IconArrowLeft } from "@/components/icons";
import { DecisionDetailClient } from "./decision-detail-client";

export default async function DecisionDetailPage({
  params,
}: {
  params: { id: string; decisionId: string };
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

  const { data: decision } = await supabase
    .from("product_decisions")
    .select("*")
    .eq("id", params.decisionId)
    .eq("user_id", user.id)
    .eq("project_id", project.id)
    .single();
  if (!decision) notFound();

  const [optionsRes, assumptionsRes, recommendationsRes, linksRes] = await Promise.all([
    supabase
      .from("product_decision_options")
      .select("*")
      .eq("decision_id", params.decisionId)
      .eq("user_id", user.id)
      .eq("project_id", project.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("product_assumptions")
      .select("*")
      .eq("decision_id", params.decisionId)
      .eq("user_id", user.id)
      .eq("project_id", project.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("product_decision_recommendations")
      .select("*")
      .eq("decision_id", params.decisionId)
      .eq("user_id", user.id)
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("product_decision_evidence_links")
      .select("*, product_evidence(*)")
      .eq("decision_id", params.decisionId)
      .eq("user_id", user.id)
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/projects/${project.id}/decisions`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to Decisions
      </Link>

      <DecisionDetailClient
        projectId={project.id}
        decision={decision as Record<string, unknown>}
        options={(optionsRes.data ?? []) as Record<string, unknown>[]}
        assumptions={(assumptionsRes.data ?? []) as Record<string, unknown>[]}
        recommendation={(recommendationsRes.data?.[0] ?? null) as Record<string, unknown> | null}
        evidenceLinks={(linksRes.data ?? []) as Record<string, unknown>[]}
      />
    </div>
  );
}
