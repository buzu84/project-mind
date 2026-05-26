"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "@/components/ui/character-counter";
import type { ActionResult } from "@/lib/validations/project";

const LIMITS = {
  description: 2000,
  goals: 1000,
} as const;

const initialState: ActionResult = { success: false, error: undefined, fieldErrors: {} };

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
  /** Whether to reset form fields after success. Defaults to true (useful for create). */
  resetOnSuccess?: boolean;
}

export function ProjectForm({
  action,
  defaultValues,
  submitLabel = "Create Project",
  onSuccess,
  resetOnSuccess = true,
}: ProjectFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const safeState = state ?? initialState;
  const formRef = useRef<HTMLFormElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [descriptionWarning, setDescriptionWarning] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionValue, setDescriptionValue] = useState(defaultValues?.description ?? "");
  const [goalsValue, setGoalsValue] = useState(defaultValues?.goals ?? "");

  // Store onSuccess in a ref so it never re-triggers the useEffect
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  // Track state object identity so the effect fires on every new result,
  // even if success stays true across consecutive saves.
  const prevStateRef = useRef(safeState);
  useEffect(() => {
    if (safeState === prevStateRef.current) return;
    prevStateRef.current = safeState;

    if (safeState.success) {
      if (resetOnSuccess) {
        formRef.current?.reset();
        setDescriptionValue("");
        setGoalsValue("");
      }
      setShowSuccess(true);
      onSuccessRef.current?.();

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => setShowSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [safeState, resetOnSuccess]);

  const fieldError = (field: string) =>
    safeState.fieldErrors?.[field]?.[0] ?? undefined;

  function handleNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    if (val.length === 0) {
      setNameError("Project name is required.");
    } else if (val.length < 2) {
      setNameError("Project name must be at least 2 characters.");
    } else {
      setNameError(null);
    }
  }

  function handleDescriptionBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const val = e.target.value.trim();
    if (val.length > 0 && val.length < 20) {
      setDescriptionWarning("Short descriptions may produce weaker AI results.");
    } else {
      setDescriptionWarning(null);
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {safeState.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {safeState.error}
        </div>
      )}

      {showSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-in fade-in duration-300" role="status">
          ✓ Project saved successfully.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Input
            id="name"
            name="name"
            label="Project Name *"
            placeholder="e.g. TaskFlow"
            defaultValue={defaultValues?.name ?? ""}
            error={nameError ?? fieldError("name")}
            onBlur={handleNameBlur}
            required
          />
        </div>
        <Input
          id="market"
          name="market"
          label="Market / Industry"
          placeholder="e.g. Project Management SaaS"
          defaultValue={defaultValues?.market ?? ""}
          error={fieldError("market")}
        />
      </div>

      <div>
        <Textarea
          id="description"
          name="description"
          label="Description"
          placeholder="What does the product do? What problem does it solve?"
          value={descriptionValue}
          onChange={(e) => setDescriptionValue(e.target.value)}
          error={fieldError("description")}
          onBlur={handleDescriptionBlur}
          maxLength={LIMITS.description}
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-gray-400">Add enough context for better AI output.</p>
          <CharacterCounter current={descriptionValue.length} max={LIMITS.description} />
        </div>
        {descriptionWarning && (
          <p className="mt-1 text-xs text-amber-600">{descriptionWarning}</p>
        )}
      </div>

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

      <div>
        <Textarea
          id="goals"
          name="goals"
          label="Goals"
          placeholder="e.g. Reach 1,000 active teams within 6 months of launch"
          value={goalsValue}
          onChange={(e) => setGoalsValue(e.target.value)}
          error={fieldError("goals")}
          maxLength={LIMITS.goals}
        />
        <div className="mt-1 flex justify-end">
          <CharacterCounter current={goalsValue.length} max={LIMITS.goals} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
