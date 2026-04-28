"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IconSparkles, IconPlus, IconTarget } from "@/components/icons";
import { createFeatureIdea, deleteFeatureIdea } from "./actions";
import type { FeatureIdea } from "./page";

interface FeaturesClientProps {
  projectId: string;
  projectName: string;
  initialFeatures: FeatureIdea[];
}

type SortKey = "rice_score" | "ice_score" | "impact" | "effort" | "created_at";

export function FeaturesClient({ projectId, projectName, initialFeatures }: FeaturesClientProps) {
  const router = useRouter();
  const [features, setFeatures] = useState<FeatureIdea[]>(initialFeatures);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isScoring, setIsScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("rice_score");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const sorted = [...features].sort((a, b) => {
    if (sortBy === "created_at") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "effort") return a[sortBy] - b[sortBy]; // lower effort first
    return b[sortBy] - a[sortBy];
  });

  function handleAddFeature(formData: FormData) {
    startTransition(async () => {
      const res = await createFeatureIdea(projectId, formData);
      if (res.success) {
        formRef.current?.reset();
        setIsFormOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Could not add feature");
      }
    });
  }

  async function handleAIScore() {
    setIsScoring(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/score-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to score features");
      }
      const data = await res.json();
      setFeatures(data.features ?? []);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to score features");
    } finally {
      setIsScoring(false);
    }
  }

  function handleDelete(featureId: string) {
    startTransition(async () => {
      await deleteFeatureIdea(projectId, featureId);
      setFeatures((prev) => prev.filter((f) => f.id !== featureId));
      router.refresh();
    });
  }

  function scoreColor(score: number, max: number): string {
    const ratio = score / max;
    if (ratio >= 0.7) return "text-emerald-700 bg-emerald-50";
    if (ratio >= 0.4) return "text-amber-700 bg-amber-50";
    return "text-gray-600 bg-gray-100";
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Feature Ideas</h2>
            <p className="mt-1 text-sm text-gray-500">
              Add features and let AI score them using RICE & ICE frameworks for <strong>{projectName}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {features.length > 0 && (
              <Button
                onClick={handleAIScore}
                isLoading={isScoring}
                disabled={isScoring}
                className="gap-2"
                variant="secondary"
              >
                <IconSparkles className="h-4 w-4" />
                AI Score All
              </Button>
            )}
            <Button onClick={() => setIsFormOpen(true)} className="gap-2" disabled={isFormOpen}>
              <IconPlus className="h-4 w-4" />
              Add Feature
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {isFormOpen && (
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">New Feature Idea</h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-sm text-gray-400 hover:text-gray-600 transition">Cancel</button>
          </div>
          <form ref={formRef} action={handleAddFeature} className="space-y-4">
            <Input id="name" name="name" label="Feature Name *" placeholder="e.g. Dark mode" required />
            <Textarea id="description" name="description" label="Description" placeholder="What does this feature do and why is it valuable?" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={isPending} disabled={isPending}>Add Feature</Button>
            </div>
          </form>
        </Card>
      )}

      {isScoring && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-6 text-center">
          <IconSparkles className="mx-auto h-8 w-8 text-brand-600 animate-pulse" />
          <p className="mt-2 text-sm font-medium text-brand-900">Scoring features with AI...</p>
          <p className="mt-1 text-xs text-brand-600">Analyzing reach, impact, confidence, and effort for each feature.</p>
        </div>
      )}

      {features.length === 0 && !isFormOpen ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <IconTarget className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">No feature ideas yet</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">Add feature ideas, then use AI to score and prioritize them.</p>
          <Button onClick={() => setIsFormOpen(true)} className="mt-6 gap-2">
            <IconPlus className="h-4 w-4" />
            Add Feature
          </Button>
        </Card>
      ) : features.length > 0 && (
        <>
          {/* Sort controls */}
          <div className="mb-4 flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Sort by:</span>
            {([["rice_score", "RICE"], ["ice_score", "ICE"], ["impact", "Impact"], ["effort", "Effort"], ["created_at", "Newest"]] as [SortKey, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`rounded-full px-3 py-1 transition ${sortBy === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Feature</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-16">R</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-16">I</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-16">C</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-16">E</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-20">RICE</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-20">ICE</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((f, idx) => {
                  const isExpanded = expandedId === f.id;
                  const hasScores = f.rice_score > 0 || f.ice_score > 0;
                  return (
                    <tr key={f.id} className="group border-b border-gray-50 hover:bg-gray-50/50 last:border-0">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setExpandedId(isExpanded ? null : f.id)} className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-300 w-5">{idx + 1}</span>
                            <div>
                              <p className="font-medium text-gray-900">{f.name}</p>
                              {f.description && !isExpanded && (
                                <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{f.description}</p>
                              )}
                            </div>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="mt-2 ml-7 space-y-2">
                            {f.description && <p className="text-xs text-gray-500">{f.description}</p>}
                            {f.ai_commentary && (
                              <div className="rounded-lg bg-brand-50 px-3 py-2">
                                <p className="text-xs font-medium text-brand-800 mb-1">AI Analysis</p>
                                <p className="text-xs text-brand-700 whitespace-pre-wrap">{f.ai_commentary}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold ${hasScores ? scoreColor(f.reach, 10) : "text-gray-300"}`}>
                          {hasScores ? f.reach : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold ${hasScores ? scoreColor(f.impact, 10) : "text-gray-300"}`}>
                          {hasScores ? f.impact : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold ${hasScores ? scoreColor(f.confidence, 10) : "text-gray-300"}`}>
                          {hasScores ? f.confidence : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold ${hasScores ? scoreColor(10 - f.effort, 10) : "text-gray-300"}`}>
                          {hasScores ? f.effort : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={f.rice_score > 0 ? "success" : "default"}>
                          {f.rice_score > 0 ? f.rice_score.toFixed(0) : "-"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={f.ice_score > 0 ? "info" : "default"}>
                          {f.ice_score > 0 ? f.ice_score.toFixed(0) : "-"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(f.id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
