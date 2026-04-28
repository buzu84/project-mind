"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteProject } from "../actions";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
}

export function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!showConfirm) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setShowConfirm(true)}>
        Delete
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
      <p className="text-xs text-red-700">
        Delete <strong>{projectName}</strong>?
      </p>
      <Button
        variant="danger"
        size="sm"
        isLoading={isPending}
        onClick={() => {
          startTransition(async () => {
            await deleteProject(projectId);
          });
        }}
      >
        Confirm
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowConfirm(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
    </div>
  );
}
