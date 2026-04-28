"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "./actions";
import { ProjectForm } from "./project-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconPlus } from "@/components/icons";

export function CreateProjectForm() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <IconPlus className="h-4 w-4" />
        New Project
      </Button>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">New Project</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-sm text-gray-400 hover:text-gray-600 transition"
        >
          Cancel
        </button>
      </div>
      <ProjectForm
        action={createProject}
        submitLabel="Create Project"
        onSuccess={() => {
          setIsOpen(false);
          router.refresh();
        }}
      />
    </Card>
  );
}
