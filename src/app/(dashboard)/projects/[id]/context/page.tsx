import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { IconArrowLeft } from "@/components/icons";
import type { ProjectContext } from "@/lib/context/types";
import { ContextForm } from "./context-form";

export default async function ProjectContextPage({
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

  const { data: context } = await supabase
    .from("project_context")
    .select("*")
    .eq("project_id", project.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to {project.name}
      </Link>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Project Context</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enrich <strong>{project.name}</strong> with structured context. The AI will use this to give better, more relevant answers.
        </p>
      </div>

      <ContextForm
        projectId={project.id}
        initialData={(context as ProjectContext | null) ?? undefined}
      />
    </div>
  );
}
