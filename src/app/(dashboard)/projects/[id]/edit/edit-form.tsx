"use client";

import { useRouter } from "next/navigation";
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
      onCancel={() => router.push(`/projects/${project.id}`)}
      resetOnSuccess={false}
    />
  );
}
