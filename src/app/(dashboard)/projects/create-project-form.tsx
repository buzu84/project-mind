"use client";

import { useRef } from "react";
import { createProject } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateProjectForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={createProject}
      className="flex items-end gap-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      <div className="flex-1">
        <Input
          id="name"
          name="name"
          label="Project name"
          placeholder="e.g. Mobile App v2"
          required
        />
      </div>
      <div className="flex-1">
        <Input
          id="description"
          name="description"
          label="Description (optional)"
          placeholder="Brief description"
        />
      </div>
      <Button type="submit">Create</Button>
    </form>
  );
}

