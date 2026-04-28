"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending} disabled={pending}>
      {label}
    </Button>
  );
}

interface ProjectFormProps {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  defaultValues?: {
    name?: string;
    description?: string | null;
    targetUsers?: string | null;
    market?: string | null;
    businessModel?: string | null;
    goals?: string | null;
  };
  submitLabel?: string;
  onSuccess?: () => void;
}

const initialState: ActionResult = { success: false };

export function ProjectForm({
  action,
  defaultValues,
  submitLabel = "Create Project",
  onSuccess,
}: ProjectFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state.success, onSuccess]);

  const fieldError = (field: string) =>
    state.fieldErrors?.[field]?.[0] ?? undefined;

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Project saved successfully.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="name"
          name="name"
          label="Project Name *"
          placeholder="e.g. TaskFlow"
          defaultValue={defaultValues?.name ?? ""}
          error={fieldError("name")}
          required
        />
        <Input
          id="market"
          name="market"
          label="Market / Industry"
          placeholder="e.g. Project Management SaaS"
          defaultValue={defaultValues?.market ?? ""}
          error={fieldError("market")}
        />
      </div>

      <Textarea
        id="description"
        name="description"
        label="Description"
        placeholder="What does the product do? What problem does it solve?"
        defaultValue={defaultValues?.description ?? ""}
        error={fieldError("description")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="targetUsers"
          name="targetUsers"
          label="Target Users"
          placeholder="e.g. Remote engineering teams (10-100 people)"
          defaultValue={defaultValues?.targetUsers ?? ""}
          error={fieldError("targetUsers")}
        />
        <Input
          id="businessModel"
          name="businessModel"
          label="Business Model"
          placeholder="e.g. Freemium with per-seat pricing"
          defaultValue={defaultValues?.businessModel ?? ""}
          error={fieldError("businessModel")}
        />
      </div>

      <Textarea
        id="goals"
        name="goals"
        label="Goals"
        placeholder="e.g. Reach 1,000 active teams within 6 months of launch"
        defaultValue={defaultValues?.goals ?? ""}
        error={fieldError("goals")}
      />

      <div className="flex items-center justify-end gap-3 pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

