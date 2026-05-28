import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { IconArrowLeft } from "@/components/icons";
import { DecisionsClient, type ProductDecision } from "./decisions-client";

export default async function DecisionsPage({
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

  const { data: decisions } = await supabase
    .from("product_decisions")
    .select("id, title, category, status, problem_statement, context_summary, confidence_score, created_at, updated_at, product_decision_recommendations(created_at)")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const enrichedDecisions: ProductDecision[] = (decisions ?? []).map((d: any) => {
    const recs = d.product_decision_recommendations as { created_at: string }[] | null;
    const latest = recs && recs.length > 0
      ? recs.reduce((a: { created_at: string }, b: { created_at: string }) =>
          a.created_at > b.created_at ? a : b
        ).created_at
      : null;
    const { product_decision_recommendations: _recs, ...rest } = d;
    return { ...rest, latest_recommendation_at: latest };
  });

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to {project.name}
      </Link>

      <DecisionsClient
        projectId={project.id}
        initialDecisions={enrichedDecisions}
      />
    </div>
  );
}

