"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { DECISION_CATEGORIES, DECISION_STATUSES } from "@/lib/decisions/constants";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {isEdit ? "Edit Decision" : "New Decision"}
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <Input
        id="decision-title"
        label="Title"
        placeholder="e.g. Adopt server-side rendering for landing pages"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={fieldErrors.title?.[0]}
        required
        minLength={3}
        maxLength={160}
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

      <Textarea
        id="decision-problem"
        label="Problem Statement"
        placeholder="What problem or decision are you facing? Be specific."
        value={problemStatement}
        onChange={(e) => setProblemStatement(e.target.value)}
        error={fieldErrors.problem_statement?.[0]}
        required
        minLength={10}
        maxLength={2000}
        rows={4}
      />

      <Textarea
        id="decision-context"
        label="Context (optional)"
        placeholder="Background context, constraints, prior art..."
        value={contextSummary}
        onChange={(e) => setContextSummary(e.target.value)}
        error={fieldErrors.context_summary?.[0]}
        maxLength={4000}
        rows={3}
      />

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving} disabled={saving}>
          {isEdit ? "Save Changes" : "Create Decision"}
        </Button>
      </div>
    </form>
  );
}

