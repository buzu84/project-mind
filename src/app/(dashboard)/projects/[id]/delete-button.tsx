"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { deleteProject } from "../actions";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
}

export function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleDelete() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await deleteProject(projectId);
        // deleteProject calls redirect() on success (which throws),
        // so we only reach here on failure.
        if (!res.success) {
          toast(res.error ?? "Could not delete project.", "error");
        }
        resolve();
      });
    });
  }

  return (
    <ConfirmDialog
      title={`Delete "${projectName}"?`}
      message="This will permanently delete the project, all generated documents, feedback, insights, and roadmaps. This action cannot be undone."
      confirmLabel="Delete Project"
      variant="danger"
      onConfirm={handleDelete}
      trigger={
        <Button variant="ghost" size="sm" disabled={isPending} className="text-red-600 hover:text-red-700 hover:bg-red-50">
          Delete
        </Button>
      }
    />
  );
}
