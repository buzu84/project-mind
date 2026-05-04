"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CONTEXT_SECTIONS, type ProjectContext, type ContextSectionKey } from "@/lib/context/types";
import { saveProjectContext } from "./actions";

interface ContextFormProps {
  projectId: string;
  initialData?: ProjectContext;
}

export function ContextForm({ projectId, initialData }: ContextFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<ContextSectionKey>>(() => {
    const expanded = new Set<ContextSectionKey>();
    if (initialData) {
      for (const section of CONTEXT_SECTIONS) {
        if (initialData[section.key]) expanded.add(section.key);
      }
    }
    if (expanded.size === 0) expanded.add("product_overview");
    return expanded;
  });

  function toggleSection(key: ContextSectionKey) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveProjectContext(projectId, formData);
      setResult(res);
      if (res.success) setTimeout(() => setResult(null), 3000);
    });
  }

  const filledCount = initialData
    ? CONTEXT_SECTIONS.filter((s) => initialData[s.key]).length
    : 0;

  return (
    <form action={handleSubmit}>
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Context completeness</span>
          <span className="text-sm text-gray-500">{filledCount}/{CONTEXT_SECTIONS.length} sections</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${(filledCount / CONTEXT_SECTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {CONTEXT_SECTIONS.map((section) => {
          const isExpanded = expandedSections.has(section.key);
          const hasContent = !!(initialData && initialData[section.key]);
          return (
            <div
              key={section.key}
              className={`rounded-xl border bg-white transition-colors ${hasContent ? "border-brand-200" : "border-gray-200"}`}
            >
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{section.icon}</span>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{section.label}</span>
                    {hasContent && (
                      <span className="ml-2 inline-flex h-5 items-center rounded-full bg-brand-50 px-2 text-xs font-medium text-brand-700">Filled</span>
                    )}
                    {!isExpanded && <p className="mt-0.5 text-xs text-gray-400">{section.description}</p>}
                  </div>
                </div>
                <svg className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isExpanded && (
                <div className="px-5 pb-5">
                  <p className="mb-3 text-xs text-gray-500">{section.description}</p>
                  <Textarea
                    id={section.key}
                    name={section.key}
                    defaultValue={initialData?.[section.key] ?? ""}
                    placeholder={section.placeholder}
                    className="min-h-[120px]"
                  />
                  <p className="mt-1.5 text-right text-xs text-gray-400">Max 3000 characters</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {result && (
        <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${result.success ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`} role="status">
          {result.success ? "Context saved successfully!" : result.error}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button type="submit" isLoading={isPending} disabled={isPending}>Save Context</Button>
      </div>
    </form>
  );
}
