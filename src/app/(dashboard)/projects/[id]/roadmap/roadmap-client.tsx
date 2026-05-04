"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconSparkles, IconClock } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Roadmap, RoadmapItem } from "./page";

// ── Helpers ─────────────────────────────────────────────────────────

interface RoadmapClientProps {
  projectId: string;
  projectName: string;
  initialRoadmap: Roadmap | null;
}

const PRIORITY_VARIANT: Record<
  string,
  "danger" | "warning" | "info" | "default"
> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "default",
};

// ── Sub-components ──────────────────────────────────────────────────

function ItemCard({ item }: { item: RoadmapItem }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
        {item.priority && (
          <Badge
            variant={PRIORITY_VARIANT[item.priority] ?? "default"}
            className="flex-shrink-0"
          >
            {item.priority}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-600">{item.description}</p>
      {item.confidence && (
        <span className="mt-2 inline-block text-xs text-gray-400">
          Confidence: {item.confidence}
        </span>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  items,
}: {
  title: string;
  icon: string;
  items: RoadmapItem[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <span>{icon}</span> {title}
        <Badge variant="default">{items.length}</Badge>
      </h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <ItemCard key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function RoadmapClient({
  projectId,
  projectName,
  initialRoadmap,
}: RoadmapClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(initialRoadmap);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateRoadmap() {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate roadmap");
      }

      const data = await res.json();
      setRoadmap(data.roadmap);
      toast("Roadmap generated successfully!");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate roadmap",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function deleteRoadmap() {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/ai/roadmap?projectId=${encodeURIComponent(projectId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete roadmap");
      }
      setRoadmap(null);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete roadmap",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Product Roadmap
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              AI-generated roadmap for <strong>{projectName}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {roadmap && (
              <ConfirmDialog
                message="Delete this roadmap? You can regenerate it later."
                confirmLabel="Delete Roadmap"
                onConfirm={deleteRoadmap}
                trigger={
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isDeleting || isGenerating}
                  >
                    {isDeleting ? "Deleting\u2026" : "Delete Roadmap"}
                  </Button>
                }
              />
            )}
            <Button
              onClick={generateRoadmap}
              isLoading={isGenerating}
              disabled={isGenerating || isDeleting}
              className="gap-2"
            >
              <IconSparkles className="h-4 w-4" />
              {roadmap ? "Regenerate Roadmap" : "Generate Roadmap"}
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Generating state */}
      {isGenerating && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-6 text-center" role="status">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
            <IconSparkles className="h-6 w-6 text-brand-600 animate-pulse" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-brand-900">
            Generating your roadmap&hellip;
          </p>
          <p className="mt-1 text-xs text-brand-600">
            Analyzing project context, feedback, and insights to build a
            strategic roadmap.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isGenerating && !roadmap && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <span className="text-2xl">{"\uD83D\uDDFA\uFE0F"}</span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            No roadmap yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Click &ldquo;Generate Roadmap&rdquo; to create an AI-powered product
            roadmap based on your project context, feedback, and insights.
          </p>
          <Button
            onClick={generateRoadmap}
            className="mt-6 gap-2"
            disabled={isGenerating}
          >
            <IconSparkles className="h-4 w-4" />
            Generate Roadmap
          </Button>
        </Card>
      )}

      {/* ── Roadmap display ──────────────────────────────────────── */}
      {roadmap && !isGenerating && (
        <div className="space-y-10">
          {/* Title & meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900">
                {roadmap.title}
              </h3>
              {process.env.NODE_ENV === "development" && roadmap.is_mock && (
                <Badge variant="warning">Mock roadmap</Badge>
              )}
            </div>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <IconClock className="h-3 w-3" />
              Generated{" "}
              {new Date(roadmap.created_at).toLocaleString()}
            </span>
          </div>

          {/* A) Now / Next / Later columns */}
          <div>
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              Priority Horizons
            </h3>
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Now */}
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg">{"\uD83D\uDFE2"}</span>
                  <span className="text-sm font-bold text-emerald-800">
                    Now
                  </span>
                  <Badge variant="success">
                    {(roadmap.now_items ?? []).length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {(roadmap.now_items ?? []).map((item, i) => (
                    <ItemCard key={i} item={item} />
                  ))}
                </div>
              </div>

              {/* Next */}
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg">{"\uD83D\uDD35"}</span>
                  <span className="text-sm font-bold text-blue-800">Next</span>
                  <Badge variant="info">
                    {(roadmap.next_items ?? []).length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {(roadmap.next_items ?? []).map((item, i) => (
                    <ItemCard key={i} item={item} />
                  ))}
                </div>
              </div>

              {/* Later */}
              <div className="rounded-xl border-2 border-gray-200 bg-gray-50/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg">{"\u26AA"}</span>
                  <span className="text-sm font-bold text-gray-700">Later</span>
                  <Badge>{(roadmap.later_items ?? []).length}</Badge>
                </div>
                <div className="space-y-2">
                  {(roadmap.later_items ?? []).map((item, i) => (
                    <ItemCard key={i} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* B) 30/60/90 day plan */}
          <div>
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              30 / 60 / 90 Day Plan
            </h3>
            <div className="grid gap-6 lg:grid-cols-3">
              <Section
                title="First 30 Days"
                icon={"\uD83D\uDCC5"}
                items={roadmap.plan_30_days ?? []}
              />
              <Section
                title="Days 31–60"
                icon={"\uD83D\uDCC6"}
                items={roadmap.plan_60_days ?? []}
              />
              <Section
                title="Days 61–90"
                icon={"\uD83D\uDDD3\uFE0F"}
                items={roadmap.plan_90_days ?? []}
              />
            </div>
          </div>

          {/* C/D/E) Risks, Dependencies, Success Metrics */}
          <div className="grid gap-8 lg:grid-cols-3">
            <Section
              title="Risks"
              icon={"\u26A0\uFE0F"}
              items={roadmap.risks ?? []}
            />
            <Section
              title="Dependencies"
              icon={"\uD83D\uDD17"}
              items={roadmap.dependencies ?? []}
            />
            <Section
              title="Success Metrics"
              icon={"\uD83D\uDCCA"}
              items={roadmap.success_metrics ?? []}
            />
          </div>
        </div>
      )}
    </>
  );
}

