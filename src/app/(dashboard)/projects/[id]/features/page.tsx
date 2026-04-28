import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { IconArrowLeft } from "@/components/icons";
import { FeaturesClient } from "./features-client";

export interface FeatureIdea {
  id: string;
  name: string;
  description: string | null;
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  rice_score: number;
  ice_score: number;
  ai_commentary: string | null;
  status: string;
  created_at: string;
}

export default async function FeaturesPage({
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
    .single();

  if (!project) notFound();

  const { data: features } = await supabase
    .from("feature_ideas")
    .select("id, name, description, reach, impact, confidence, effort, rice_score, ice_score, ai_commentary, status, created_at")
    .eq("project_id", project.id)
    .order("rice_score", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to {project.name}
      </Link>

      <FeaturesClient
        projectId={project.id}
        projectName={project.name}
        initialFeatures={(features ?? []) as FeatureIdea[]}
      />
    </div>
  );
}
