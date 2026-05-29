import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { IconArrowLeft } from "@/components/icons";
import { EditProjectForm } from "./edit-form";

export default async function EditProjectPage({
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
      "id, name, description, target_users, market, business_model, goals"
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to {project.name}
      </Link>

      <Card>
        <h1 className="text-lg font-semibold text-gray-900">Edit Project</h1>
        <p className="mt-1 mb-6 text-sm text-gray-500">
          Update your project details below.
        </p>
        <EditProjectForm project={project} />
      </Card>
    </div>
  );
}

