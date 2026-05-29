"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { IconSparkles, IconPlus, IconTarget } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { CharacterCounter } from "@/components/ui/character-counter";
import { MinLengthHint } from "@/components/ui/min-length-hint";
import { focusAfterPaint, focusFirstAvailable } from "@/lib/focus-utils";
import { createFeatureIdea, updateFeatureIdea, deleteFeatureIdea } from "./actions";
import type { FeatureIdea } from "./page";
import {
  FEATURE_NAME_MIN,
  FEATURE_NAME_MAX,
  FEATURE_DESC_MIN,
  FEATURE_DESC_MAX,
  FEATURE_DESC_QUALITY_HELPER,
} from "@/lib/validations/feature";

interface FeaturesClientProps {
  projectId: string;
  projectName: string;
  initialFeatures: FeatureIdea[];
}

type SortKey = "rice_score" | "ice_score" | "impact" | "effort" | "created_at";

type ScoreState = "not_scored" | "scored" | "outdated";


function getScoreState(f: FeatureIdea): ScoreState {
  const hasScores = f.rice_score > 0 || f.ice_score > 0;
  if (!hasScores) return "not_scored";
  // A feature is "outdated" if the user edited it AFTER the last scoring run.
  // We compare updated_at against scored_at. If the feature was updated after
  // scoring (e.g. name/description changed), it needs re-scoring.
  if (f.scored_at && f.updated_at) {
    const scored = new Date(f.scored_at).getTime();
    const updated = new Date(f.updated_at).getTime();
    // Allow a small tolerance — the scoring .update() itself triggers
    // the updated_at DB trigger, so updated_at ≈ scored_at after scoring.
    if (updated > scored + 2000) return "outdated";
  }
  return "scored";
}

export function FeaturesClient({ projectId, projectName, initialFeatures }: FeaturesClientProps) {
  const router = useRouter();
  const [features, setFeatures] = useState<FeatureIdea[]>(initialFeatures);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isScoring, setIsScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with server props when no local operation is in-flight.
  const [prevInitial, setPrevInitial] = useState(initialFeatures);
  if (initialFeatures !== prevInitial && !isScoring && !isPending) {
    setPrevInitial(initialFeatures);
    setFeatures(initialFeatures);
  }
  const { toast: showToast } = useToast();
  const [sortBy, setSortBy] = useState<SortKey>("rice_score");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editNameBlurred, setEditNameBlurred] = useState(false);
  const [editDescBlurred, setEditDescBlurred] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const addNameInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editTriggerRef = useRef<HTMLElement | null>(null);
  const addFeatureButtonRef = useRef<HTMLButtonElement>(null);
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);
  const scoreButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the section heading on route entry
  useEffect(() => {
    focusAfterPaint(() => sectionHeadingRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus the first input when add or edit form opens
  useEffect(() => {
    if (editingId) {
      focusAfterPaint(() => editInputRef.current);
    }
  }, [editingId]);

  useEffect(() => {
    if (isFormOpen) {
      focusAfterPaint(() => addNameInputRef.current);
    }
  }, [isFormOpen]);

  // Create form validation
  const [featureName, setFeatureName] = useState("");
  const [featureDesc, setFeatureDesc] = useState("");
  const [nameBlurred, setNameBlurred] = useState(false);
  const [descBlurred, setDescBlurred] = useState(false);

  const nameError = nameBlurred && featureName.trim().length < FEATURE_NAME_MIN
    ? `Feature name must be at least ${FEATURE_NAME_MIN} characters.`
    : null;
  const descError = descBlurred && featureDesc.trim().length < FEATURE_DESC_MIN
    ? FEATURE_DESC_QUALITY_HELPER
    : null;
  const isFormValid = featureName.trim().length >= FEATURE_NAME_MIN && featureDesc.trim().length >= FEATURE_DESC_MIN;

  // Edit form validation
  const editNameError = editNameBlurred && editName.trim().length < FEATURE_NAME_MIN
    ? `Feature name must be at least ${FEATURE_NAME_MIN} characters.`
    : null;
  const editDescError = editDescBlurred && editDesc.trim().length < FEATURE_DESC_MIN
    ? FEATURE_DESC_QUALITY_HELPER
    : null;
  const isEditValid = editName.trim().length >= FEATURE_NAME_MIN && editDesc.trim().length >= FEATURE_DESC_MIN;

  const sorted = [...features].sort((a, b) => {
    if (sortBy === "created_at") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "effort") return (a[sortBy] ?? 0) - (b[sortBy] ?? 0);
    return (b[sortBy] ?? 0) - (a[sortBy] ?? 0);
  });

  function startEditing(f: FeatureIdea, triggerElement?: HTMLElement) {
    editTriggerRef.current = triggerElement ?? null;
    setEditingId(f.id);
    setEditName(f.name);
    setEditDesc(f.description ?? "");
    setEditNameBlurred(false);
    setEditDescBlurred(false);
    setExpandedId(null);
  }

  function cancelEditing() {
    const trigger = editTriggerRef.current;
    setEditingId(null);
    setEditName("");
    setEditDesc("");
    setEditNameBlurred(false);
    setEditDescBlurred(false);
    // Restore focus to the Edit button that opened the form
    focusAfterPaint(() =>
      trigger && trigger.isConnected ? trigger : null,
    );
  }

  async function saveEdit(featureId: string) {
    setEditNameBlurred(true);
    setEditDescBlurred(true);
    if (!isEditValid) return;

    setEditSaving(true);
    const res = await updateFeatureIdea(projectId, featureId, {
      name: editName.trim(),
      description: editDesc.trim(),
    });

    if (res.success) {
      setFeatures((prev) =>
        prev.map((f) =>
          f.id === featureId
            ? { ...f, name: editName.trim(), description: editDesc.trim(), updated_at: new Date().toISOString() }
            : f,
        ),
      );
      const trigger = editTriggerRef.current;
      setEditingId(null);
      setHighlightId(featureId);
      setTimeout(() => setHighlightId(null), 1500);
      showToast("Feature updated");
      router.refresh();
      // Restore focus to the Edit button
      focusAfterPaint(() =>
        trigger && trigger.isConnected ? trigger : null,
      );
    } else {
      setError(res.error ?? "Could not update feature.");
    }
    setEditSaving(false);
  }

  function handleAddFeature(formData: FormData) {
    setNameBlurred(true);
    setDescBlurred(true);
    if (!isFormValid) return;

    setError(null);
    startTransition(async () => {
      const res = await createFeatureIdea(projectId, formData);
      if (res.success) {
        const dbId = res.data?.id as string | undefined;
        if (!dbId) {
          // Server confirmed insert but didn't return an ID — reload to get real data
          showToast("Feature added");
          router.refresh();
          return;
        }
        const name = formData.get("name") as string;
        const description = (formData.get("description") as string) || null;
        const created: FeatureIdea = {
          id: dbId,
          name,
          description,
          reach: 0, impact: 0, confidence: 0, effort: 0,
          priority: 0,
          rice_score: 0, ice_score: 0,
          ai_commentary: null, status: "idea",
          project_id: projectId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          scored_at: null,
        };
        setFeatures((prev) => [...prev, created]);
        formRef.current?.reset();
        setFeatureName("");
        setFeatureDesc("");
        setNameBlurred(false);
        setDescBlurred(false);
        setIsFormOpen(false);
        showToast("Feature added");
        router.refresh();
        focusAfterPaint(() => addFeatureButtonRef.current);
      } else {
        setError(res.error ?? res.fieldErrors?.name?.[0] ?? res.fieldErrors?.description?.[0] ?? "Could not add feature");
      }
    });
  }

  async function handleAIScore() {
    const underDescribed = features.filter((f) => !f.description || f.description.trim().length < FEATURE_DESC_MIN);
    if (underDescribed.length > 0) {
      setError("Add a more detailed description before using AI scoring. Some features have descriptions that are too short.");
      return;
    }

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
      showToast("Features scored successfully");
      router.refresh();
      focusAfterPaint(() => scoreButtonRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to score features");
    } finally {
      setIsScoring(false);
    }
  }

  function handleDelete(featureId: string) {
    startTransition(async () => {
      const res = await deleteFeatureIdea(projectId, featureId);
      if (res.success) {
        setFeatures((prev) => prev.filter((f) => f.id !== featureId));
        if (editingId === featureId) cancelEditing();
        showToast("Feature deleted");
        router.refresh();
        // Focus fallback: Add Feature button or section heading
        focusFirstAvailable(
          addFeatureButtonRef.current,
          sectionHeadingRef.current,
        );
      } else {
        setError(res.error ?? "Could not delete feature.");
      }
    });
  }

  function scoreColor(score: number, max: number): string {
    const ratio = score / max;
    if (ratio >= 0.7) return "text-emerald-700 bg-emerald-50";
    if (ratio >= 0.4) return "text-amber-700 bg-amber-50";
    return "text-gray-600 bg-gray-100";
  }

  function renderScoreCell(value: number, max: number, state: ScoreState) {
    if (state === "not_scored") {
      return <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-xs text-gray-300">—</span>;
    }
    return (
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold ${scoreColor(value, max)}`}>
        {value}
      </span>
    );
  }

  function renderAggregateBadge(score: number, variant: "success" | "info", state: ScoreState) {
    if (state === "not_scored") {
      return <span className="text-xs text-gray-300">—</span>;
    }
    return (
      <div className="flex flex-col items-center gap-0.5">
        <Badge variant={variant}>{score.toFixed(0)}</Badge>
        {state === "outdated" && (
          <span className="text-[10px] text-amber-600 font-medium" title="Feature changed after scoring">Outdated</span>
        )}
      </div>
    );
  }

  return (
    <>

      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 ref={sectionHeadingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 focus:outline-none">Feature Ideas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Add features and let AI score them using RICE &amp; ICE frameworks for <strong>{projectName}</strong>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {features.length > 0 && (
              <Button
                ref={scoreButtonRef}
                onClick={handleAIScore}
                isLoading={isScoring}
                disabled={isScoring || editingId !== null}
                className="gap-2 whitespace-nowrap"
                variant="secondary"
              >
                <IconSparkles className="h-4 w-4" />
                {isScoring ? "Scoring..." : "AI Score All"}
              </Button>
            )}
            <Button ref={addFeatureButtonRef} onClick={() => setIsFormOpen(true)} className="gap-2 whitespace-nowrap" disabled={isFormOpen}>
              <IconPlus className="h-4 w-4" />
              Add Feature
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {isFormOpen && (
        <Card className="mb-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">New Feature Idea</h3>
          </div>
          <form ref={formRef} action={handleAddFeature} className="space-y-4">
            <div>
              <Input
                ref={addNameInputRef}
                id="name" name="name" label="Feature Name *"
                placeholder="e.g. Dark mode" required
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                onBlur={() => setNameBlurred(true)}
                error={nameError ?? undefined}
                maxLength={FEATURE_NAME_MAX}
              />
              <div className="mt-1 flex justify-end">
                <CharacterCounter current={featureName.length} max={FEATURE_NAME_MAX} />
              </div>
            </div>
            <div>
              <Textarea
                id="description" name="description" label="Description *"
                placeholder="What does this feature do and why is it valuable?"
                value={featureDesc}
                onChange={(e) => setFeatureDesc(e.target.value)}
                onBlur={() => setDescBlurred(true)}
                error={descError ?? undefined}
                maxLength={FEATURE_DESC_MAX}
              />
              <div className="mt-1 flex items-center justify-between">
                <MinLengthHint current={featureDesc.trim().length} min={FEATURE_DESC_MIN} />
                <CharacterCounter current={featureDesc.length} max={FEATURE_DESC_MAX} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => { setIsFormOpen(false); setFeatureName(""); setFeatureDesc(""); setNameBlurred(false); setDescBlurred(false); focusAfterPaint(() => addFeatureButtonRef.current); }}>Cancel</Button>
              <Button type="submit" isLoading={isPending} disabled={isPending || !isFormValid}>Add Feature</Button>
            </div>
          </form>
        </Card>
      )}

      {isScoring && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-6 text-center" role="status">
          <IconSparkles className="mx-auto h-8 w-8 text-brand-600 animate-pulse" aria-hidden="true" />
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
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium whitespace-nowrap">Sort by:</span>
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

          {/* AI scoring note */}
          {sorted.some((f) => getScoreState(f) !== "not_scored") && (
            <p className="mb-3 text-xs text-gray-400">
              Scores are AI-estimated based on your project context. Similar features may receive different scores due to differences in reach, impact, effort, and confidence.
            </p>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-[640px] w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Feature</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-14" title="Reach: How many users will this impact? (1-10)"><abbr title="Reach">R</abbr></th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-14" title="Impact: How much will this move the needle? (1-10)"><abbr title="Impact">I</abbr></th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-14" title="Confidence: How sure are we about the estimates? (1-10)"><abbr title="Confidence">C</abbr></th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-14" title="Effort: How much work is required? Lower is better. (1-10)"><abbr title="Effort">E</abbr></th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-20" title="RICE Score = (Reach × Impact × Confidence) / Effort">RICE</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-20" title="ICE Score = Impact × Confidence × Ease">ICE</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((f, idx) => {
                  const isExpanded = expandedId === f.id;
                  const isEditing = editingId === f.id;
                  const state = getScoreState(f);
                  const isHighlighted = highlightId === f.id;

                  if (isEditing) {
                    return (
                      <tr key={f.id} className="border-b border-gray-50 bg-blue-50/30">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="space-y-3">
                            <Input
                              ref={editInputRef}
                              id={`edit-name-${f.id}`}
                              label="Feature Name *"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={() => setEditNameBlurred(true)}
                              error={editNameError ?? undefined}
                              maxLength={FEATURE_NAME_MAX}
                            />
                            <div className="mt-1 flex justify-end">
                              <CharacterCounter current={editName.length} max={FEATURE_NAME_MAX} />
                            </div>
                            <div>
                              <Textarea
                                id={`edit-desc-${f.id}`}
                                label="Description *"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                onBlur={() => setEditDescBlurred(true)}
                                error={editDescError ?? undefined}
                                maxLength={FEATURE_DESC_MAX}
                              />
                              <div className="mt-1 flex items-center justify-between">
                                <MinLengthHint current={editDesc.trim().length} min={FEATURE_DESC_MIN} />
                                <CharacterCounter current={editDesc.length} max={FEATURE_DESC_MAX} />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="secondary" size="sm" onClick={cancelEditing} disabled={editSaving}>
                                Cancel
                              </Button>
                              <Button type="button" size="sm" onClick={() => saveEdit(f.id)} isLoading={editSaving} disabled={editSaving || !isEditValid}>
                                Save
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={f.id}
                      className={`group border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${
                        isHighlighted ? "bg-emerald-50/60" : "hover:bg-gray-50/50"
                      }`}
                    >
                      <td className="px-4 py-3 overflow-hidden">
                        <button type="button" onClick={() => setExpandedId(isExpanded ? null : f.id)} className="text-left w-full">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-300 w-5 shrink-0">{idx + 1}</span>
                            <div className="min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{f.name}</p>
                                {state === "not_scored" && (
                                  <span className="text-[10px] text-gray-400 font-medium">Not scored</span>
                                )}
                              </div>
                              {f.description && !isExpanded && (
                                <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{f.description}</p>
                              )}
                            </div>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="mt-2 ml-7 space-y-2">
                            {f.description && <p className="text-xs text-gray-500 whitespace-pre-wrap">{f.description}</p>}
                            {f.ai_commentary && (
                              <div className="rounded-lg bg-brand-50 px-3 py-2">
                                <p className="text-xs font-medium text-brand-800 mb-1">AI Analysis</p>
                                <p className="text-xs text-brand-700 whitespace-pre-wrap">{f.ai_commentary}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">{renderScoreCell(f.reach, 10, state)}</td>
                      <td className="px-3 py-3 text-center">{renderScoreCell(f.impact, 10, state)}</td>
                      <td className="px-3 py-3 text-center">{renderScoreCell(f.confidence, 10, state)}</td>
                      <td className="px-3 py-3 text-center">{renderScoreCell(10 - f.effort, 10, state)}</td>
                      <td className="px-3 py-3 text-center">{renderAggregateBadge(f.rice_score, "success", state)}</td>
                      <td className="px-3 py-3 text-center">{renderAggregateBadge(f.ice_score, "info", state)}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startEditing(f, e.currentTarget); }}
                            className="text-xs text-gray-500 hover:text-brand-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                            aria-label={`Edit ${f.name}`}
                          >
                            Edit
                          </button>
                          <ConfirmDialog
                            title={`Delete "${f.name}"?`}
                            message={`This will permanently delete "${f.name}". This action cannot be undone.`}
                            confirmLabel="Delete"
                            variant="danger"
                            onConfirm={() => handleDelete(f.id)}
                            focusFallbackRef={addFeatureButtonRef}
                            trigger={
                              <button
                                type="button"
                                className="text-xs text-gray-400 hover:text-red-500 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                                aria-label={`Delete ${f.name}`}
                              >
                                Delete
                              </button>
                            }
                          />
                        </div>
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
