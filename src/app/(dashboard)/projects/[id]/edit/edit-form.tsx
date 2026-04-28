"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProject } from "../../actions";
import { ProjectForm } from "../../project-form";

interface EditProjectFormProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    target_users: string | null;
    market: string | null;
    business_model: string | null;
    goals: string | null;
  };
}

export function EditProjectForm({ project }: EditProjectFormProps) {
  const router = useRouter();
  const boundAction = updateProject.bind(null, project.id);

  return (
    <div>
      <ProjectForm
        action={boundAction}
        defaultValues={{
          name: project.name,
          description: project.description,
          targetUsers: project.target_users,
          market: project.market,
          businessModel: project.business_model,
          goals: project.goals,
        }}
        submitLabel="Save Changes"
        resetOnSuccess={false}
        onSuccess={() => {
          router.refresh();
        }}
      />
      <div className="mt-4 flex items-center gap-3 text-sm">
        <Link
          href={`/projects/${project.id}`}
          className="text-gray-500 hover:text-gray-700 transition"
        >
          ← View Project
        </Link>
        <Link
          href="/projects"
          className="text-gray-500 hover:text-gray-700 transition"
        >
          ← Back to Projects
        </Link>
      </div>
    </div>
  );
}
