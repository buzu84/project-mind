"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { CharacterCounter } from "@/components/ui/character-counter";
import { DECISION_CATEGORIES, DECISION_STATUSES } from "@/lib/decisions/constants";
import {
  DECISION_TITLE_MIN,
  DECISION_TITLE_MAX,
  DECISION_PROBLEM_MIN,
  DECISION_PROBLEM_MAX,
  DECISION_PROBLEM_QUALITY_MIN,
  DECISION_PROBLEM_QUALITY_HELPER,
  DECISION_CONTEXT_MAX,
  DECISION_CONTEXT_QUALITY_HELPER,
} from "@/lib/validations/decision";
import type { ProductDecision } from "./decisions-client";


const categoryLabels: Record<string, string> = {
  product: "Product",
  technical: "Technical",
  growth: "Growth",
  ux: "UX",
  business: "Business",
  strategy: "Strategy",
  other: "Other",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  revisit: "Revisit",
};

interface DecisionFormProps {
  projectId: string;
  decision?: ProductDecision | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FieldErrors {
  title?: string[];
  category?: string[];
  problem_statement?: string[];
  context_summary?: string[];
  status?: string[];
}

export function DecisionForm({ projectId, decision, onSuccess, onCancel }: DecisionFormProps) {
  const isEdit = !!decision;
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { toast } = useToast();

  const [title, setTitle] = useState(decision?.title ?? "");
  const [category, setCategory] = useState(decision?.category ?? "other");
  const [status, setStatus] = useState(decision?.status ?? "draft");
  const [problemStatement, setProblemStatement] = useState(decision?.problem_statement ?? "");
  const [contextSummary, setContextSummary] = useState(decision?.context_summary ?? "");

  // Client-side validation state (blur / submit-attempted)
  const [titleTouched, setTitleTouched] = useState(false);
  const [problemTouched, setProblemTouched] = useState(false);
  const [contextTouched, setContextTouched] = useState(false);

  // Computed client-side errors
  const titleClientError =
    titleTouched && title.trim().length < DECISION_TITLE_MIN
      ? `Title must be at least ${DECISION_TITLE_MIN} characters.`
      : titleTouched && title.trim().length > DECISION_TITLE_MAX
        ? `Title must be under ${DECISION_TITLE_MAX} characters.`
        : null;
  const problemClientError =
    problemTouched && problemStatement.trim().length < DECISION_PROBLEM_MIN
      ? `Problem statement must be at least ${DECISION_PROBLEM_MIN} characters.`
      : problemTouched && problemStatement.trim().length > DECISION_PROBLEM_MAX
        ? `Problem statement must be under ${DECISION_PROBLEM_MAX.toLocaleString()} characters.`
        : null;
  const contextClientError =
    contextTouched && contextSummary.trim().length > DECISION_CONTEXT_MAX
      ? `Context must be under ${DECISION_CONTEXT_MAX.toLocaleString()} characters.`
      : null;

  const isFormValid =
    title.trim().length >= DECISION_TITLE_MIN &&
    title.trim().length <= DECISION_TITLE_MAX &&
    problemStatement.trim().length >= DECISION_PROBLEM_MIN &&
    problemStatement.trim().length <= DECISION_PROBLEM_MAX &&
    contextSummary.trim().length <= DECISION_CONTEXT_MAX;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Force touched state on all required fields so errors appear
    setTitleTouched(true);
    setProblemTouched(true);
    setContextTouched(true);

    // Block submit if client-side invalid
    if (!isFormValid) return;

    setFieldErrors({});
    setSaving(true);

    const body = {
      title,
      category,
      status,
      problem_statement: problemStatement,
      context_summary: contextSummary || null,
    };

    try {
      const url = isEdit
        ? `/api/projects/${projectId}/decisions/${decision!.id}`
        : `/api/projects/${projectId}/decisions`;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.issues) {
          setFieldErrors(data.issues);
        } else {
          toast(data.error ?? "Something went wrong", "error");
        }
        return;
      }

      onSuccess();
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {isEdit ? "Edit Decision" : "New Decision"}
        </h2>
      </div>

      <Input
        id="decision-title"
        label="Title"
        placeholder="e.g. Adopt server-side rendering for landing pages"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => setTitleTouched(true)}
        error={titleClientError ?? fieldErrors.title?.[0]}
        aria-invalid={!!(titleClientError || fieldErrors.title?.[0])}
        maxLength={DECISION_TITLE_MAX}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="decision-category" className="mb-1 block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            id="decision-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {DECISION_CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryLabels[c] ?? c}</option>
            ))}
          </select>
          {fieldErrors.category && (
            <p className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.category[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="decision-status" className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="decision-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {DECISION_STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabels[s] ?? s}</option>
            ))}
          </select>
          {fieldErrors.status && (
            <p className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.status[0]}</p>
          )}
        </div>
      </div>

      <div>
        <Textarea
          id="decision-problem"
          label="Problem Statement"
          placeholder="What problem or decision are you facing? Be specific."
          value={problemStatement}
          onChange={(e) => setProblemStatement(e.target.value)}
          onBlur={() => setProblemTouched(true)}
          error={problemClientError ?? fieldErrors.problem_statement?.[0]}
          aria-invalid={!!(problemClientError || fieldErrors.problem_statement?.[0])}
          maxLength={DECISION_PROBLEM_MAX}
          rows={4}
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          {problemStatement.trim().length > 0 && problemStatement.trim().length < DECISION_PROBLEM_QUALITY_MIN ? (
            <p className="text-xs text-amber-600">{DECISION_PROBLEM_QUALITY_HELPER}</p>
          ) : (
            <span />
          )}
          <CharacterCounter current={problemStatement.length} max={DECISION_PROBLEM_MAX} />
        </div>
      </div>

      <div>
        <Textarea
          id="decision-context"
          label="Context (optional)"
          placeholder="Background context, constraints, prior art..."
          value={contextSummary}
          onChange={(e) => setContextSummary(e.target.value)}
          onBlur={() => setContextTouched(true)}
          error={contextClientError ?? fieldErrors.context_summary?.[0]}
          aria-invalid={!!(contextClientError || fieldErrors.context_summary?.[0])}
          maxLength={DECISION_CONTEXT_MAX}
          rows={3}
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-400">{DECISION_CONTEXT_QUALITY_HELPER}</p>
          <CharacterCounter current={contextSummary.length} max={DECISION_CONTEXT_MAX} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving} disabled={saving || !isFormValid}>
          {isEdit ? "Save Changes" : "Create Decision"}
        </Button>
      </div>
    </form>
  );
}

