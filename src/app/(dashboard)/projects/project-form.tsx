"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "@/components/ui/character-counter";
import { focusAfterPaint } from "@/lib/focus-utils";
import {
  PROJECT_NAME_MIN,
  PROJECT_NAME_MAX,
  PROJECT_DESC_MAX,
  PROJECT_TARGET_USERS_MAX,
  PROJECT_MARKET_MAX,
  PROJECT_BUSINESS_MODEL_MAX,
  PROJECT_GOALS_MAX,
  PROJECT_DESC_QUALITY_MIN,
} from "@/lib/validations/project";
import type { ActionResult } from "@/lib/validations/project";


const initialState: ActionResult = { success: false, error: undefined, fieldErrors: {} };

function SubmitButton({ label, formDisabled }: { label: string; formDisabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending} disabled={pending || formDisabled}>
      {label}
    </Button>
  );
}

interface ProjectFormProps {
  action: (_prev: ActionResult, _formData: FormData) => Promise<ActionResult>;
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
  onCancel?: () => void;
  /** Whether to reset form fields after success. Defaults to true (useful for create). */
  resetOnSuccess?: boolean;
}

export function ProjectForm({
  action,
  defaultValues,
  submitLabel = "Create Project",
  onSuccess,
  onCancel,
  resetOnSuccess = true,
}: ProjectFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const safeState = state ?? initialState;
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [descriptionWarning, setDescriptionWarning] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState(defaultValues?.name ?? "");
  const [descriptionValue, setDescriptionValue] = useState(defaultValues?.description ?? "");
  const [goalsValue, setGoalsValue] = useState(defaultValues?.goals ?? "");

  const isFormValid = nameValue.trim().length >= PROJECT_NAME_MIN;

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
        setNameValue("");
        setDescriptionValue("");
        setGoalsValue("");
      }
      setShowSuccess(true);
      onSuccessRef.current?.();
      focusAfterPaint(() => successRef.current);

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
    } else if (val.length < PROJECT_NAME_MIN) {
      setNameError(`Project name must be at least ${PROJECT_NAME_MIN} characters.`);
    } else {
      setNameError(null);
    }
  }

  function handleDescriptionBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const val = e.target.value.trim();
    if (val.length > 0 && val.length < PROJECT_DESC_QUALITY_MIN) {
      setDescriptionWarning("Short descriptions may produce weaker AI results.");
    } else {
      setDescriptionWarning(null);
    }
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-5">
      {safeState.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {safeState.error}
        </div>
      )}

      {showSuccess && (
        <div ref={successRef} tabIndex={-1} className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-in fade-in duration-300 focus:outline-none" role="status">
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
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            error={nameError ?? fieldError("name")}
            onBlur={handleNameBlur}
            maxLength={PROJECT_NAME_MAX}
          />
        </div>
        <Input
          id="market"
          name="market"
          label="Market / Industry"
          placeholder="e.g. Project Management SaaS"
          defaultValue={defaultValues?.market ?? ""}
          error={fieldError("market")}
          maxLength={PROJECT_MARKET_MAX}
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
          maxLength={PROJECT_DESC_MAX}
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-gray-400">Add enough context for better AI output.</p>
          <CharacterCounter current={descriptionValue.length} max={PROJECT_DESC_MAX} />
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
          maxLength={PROJECT_TARGET_USERS_MAX}
        />
        <Input
          id="businessModel"
          name="businessModel"
          label="Business Model"
          placeholder="e.g. Freemium with per-seat pricing"
          defaultValue={defaultValues?.businessModel ?? ""}
          error={fieldError("businessModel")}
          maxLength={PROJECT_BUSINESS_MODEL_MAX}
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
          maxLength={PROJECT_GOALS_MAX}
        />
        <div className="mt-1 flex justify-end">
          <CharacterCounter current={goalsValue.length} max={PROJECT_GOALS_MAX} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <SubmitButton label={submitLabel} formDisabled={!isFormValid} />
      </div>
    </form>
  );
}
