import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { IconArrowLeft } from "@/components/icons";
import { RoadmapClient } from "./roadmap-client";

export interface RoadmapItem {
  title: string;
  description: string;
  priority?: string;
  confidence?: string;
}

export interface Roadmap {
  id: string;
  project_id: string;
  title: string;
  now_items: RoadmapItem[];
  next_items: RoadmapItem[];
  later_items: RoadmapItem[];
  plan_30_days: RoadmapItem[];
  plan_60_days: RoadmapItem[];
  plan_90_days: RoadmapItem[];
  risks: RoadmapItem[];
  dependencies: RoadmapItem[];
  success_metrics: RoadmapItem[];
  is_mock?: boolean;
  created_at: string;
}

export default async function RoadmapPage({
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

  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("project_id", project.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to {project.name}
      </Link>

      <RoadmapClient
        projectId={project.id}
        projectName={project.name}
        initialRoadmap={(roadmap as Roadmap) ?? null}
      />
    </div>
  );
}

