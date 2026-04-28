"use client";

import { updateProject } from "../../actions";
import { ProjectForm } from "../../project-form";

interface EditProjectFormProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    targetUsers: string | null;
    market: string | null;
    businessModel: string | null;
    goals: string | null;
  };
}

export function EditProjectForm({ project }: EditProjectFormProps) {
  const boundAction = updateProject.bind(null, project.id);

  return (
    <ProjectForm
      action={boundAction}
      defaultValues={project}
      submitLabel="Save Changes"
    />
  );
}
