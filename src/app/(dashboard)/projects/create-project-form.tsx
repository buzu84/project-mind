"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "./actions";
import { ProjectForm } from "./project-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconPlus } from "@/components/icons";
import { focusAfterPaint } from "@/lib/focus-utils";

export function CreateProjectForm() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const newProjectButtonRef = useRef<HTMLButtonElement>(null);

  if (!isOpen) {
    return (
      <Button ref={newProjectButtonRef} onClick={() => setIsOpen(true)} className="gap-2">
        <IconPlus className="h-4 w-4" />
        New Project
      </Button>
    );
  }

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">New Project</h3>
      </div>
      <ProjectForm
        action={createProject}
        submitLabel="Create Project"
        onCancel={() => {
          setIsOpen(false);
          focusAfterPaint(() => newProjectButtonRef.current);
        }}
        onSuccess={() => {
          setIsOpen(false);
          router.refresh();
          focusAfterPaint(() => newProjectButtonRef.current);
        }}
      />
    </Card>
  );
}
