"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconSparkles, IconClock } from "@/components/icons";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { useToast } from "@/components/ui/toast";

interface Insight {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata: {
    priority: string;
    confidence: string;
    suggested_action: string;
  } | null;
  created_at: string;
}

interface InsightsClientProps {
  projectId: string;
  projectName: string;
  initialInsights: Insight[];
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; variant: "info" | "success" | "warning" | "danger" | "default" }> = {
  risk: { label: "Risk", icon: "\u26A0\uFE0F", variant: "danger" },
  opportunity: { label: "Opportunity", icon: "\u{1F4A1}", variant: "success" },
  next_action: { label: "Next Action", icon: "\u{1F3AF}", variant: "info" },
  roadmap: { label: "Roadmap", icon: "\u{1F5FA}\uFE0F", variant: "info" },
  assumption: { label: "Assumption", icon: "\u2753", variant: "warning" },
  pain_point: { label: "Pain Point", icon: "\u{1F525}", variant: "danger" },
  strategic_gap: { label: "Strategic Gap", icon: "\u{1F50D}", variant: "warning" },
};

const PRIORITY_VARIANT: Record<string, "danger" | "warning" | "info" | "default"> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "default",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export function InsightsClient({ projectId, projectName, initialInsights }: InsightsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>(initialInsights);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Keep insights in sync when server re-fetches (e.g. after navigation)
  // but only when not in a local-state-driven flow (i.e. after generation)
  const [hasLocalUpdate, setHasLocalUpdate] = useState(false);

  // If server provides new data and we haven't just generated locally, sync
  if (!hasLocalUpdate && initialInsights.length !== insights.length && initialInsights.length > 0) {
    setInsights(initialInsights);
  }

  async function generateInsights() {
    setIsGenerating(true);
    setError(null);
    setHasLocalUpdate(false);

    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate insights");
      }

      const data = await res.json();
      const newInsights: Insight[] = data.insights ?? [];

      // Set local state immediately — this is the SOURCE OF TRUTH for this render cycle
      setInsights(newInsights);
      setHasLocalUpdate(true);
      if (newInsights.length > 0) {
        toast(`Generated ${newInsights.length} insights`);
      }

      // Refresh server data in background (for next page load)
      // Use setTimeout to avoid potential race with state update
      setTimeout(() => router.refresh(), 100);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  }

  const filteredInsights = activeFilter
    ? insights.filter((i) => i.type === activeFilter)
    : insights;

  // Count by type
  const typeCounts = insights.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Insights</h2>
            <p className="mt-1 text-sm text-gray-500">
              Strategic analysis and recommendations for <strong>{projectName}</strong>
            </p>
          </div>
          <Button
            onClick={generateInsights}
            isLoading={isGenerating}
            disabled={isGenerating}
            className="gap-2"
          >
            <IconSparkles className="h-4 w-4" />
            {insights.length > 0 ? "Regenerate Insights" : "Generate AI Insights"}
          </Button>
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
          <p className="text-sm font-medium text-brand-900">Analyzing your project...</p>
          <p className="mt-1 text-xs text-brand-600">
            Reviewing context, feedback, and market data to generate strategic insights.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isGenerating && insights.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <IconSparkles className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">No insights yet</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Click &ldquo;Generate AI Insights&rdquo; to analyze your project and get strategic recommendations.
          </p>
          <Button onClick={generateInsights} className="mt-6 gap-2" disabled={isGenerating}>
            <IconSparkles className="h-4 w-4" />
            Generate AI Insights
          </Button>
        </Card>
      )}

      {/* Filter pills */}
      {insights.length > 0 && !isGenerating && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeFilter === null
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All ({insights.length})
            </button>
            {Object.entries(typeCounts).map(([type, count]) => {
              const config = TYPE_CONFIG[type];
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    activeFilter === type
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {config?.icon} {config?.label ?? type} ({count})
                </button>
              );
            })}
          </div>

          {/* Insights grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredInsights.map((insight) => {
              const config = TYPE_CONFIG[insight.type] ?? { label: insight.type, icon: "\u{1F4CB}", variant: "default" as const };
              const meta = insight.metadata;
              const priority = meta?.priority ?? "medium";
              const confidence = meta?.confidence ?? "medium";

              return (
                <Card key={insight.id} className="flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <Badge variant={PRIORITY_VARIANT[priority] ?? "default"}>
                      {priority}
                    </Badge>
                  </div>

                  <h4 className="mt-3 text-sm font-semibold text-gray-900">{insight.title}</h4>
                  <p className="mt-1.5 flex-1 text-sm text-gray-600">{insight.content}</p>

                  {meta?.suggested_action && (
                    <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2">
                      <p className="text-xs font-medium text-brand-800">
                        {"\u{1F3AF}"} {meta.suggested_action}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <span>{CONFIDENCE_LABELS[confidence] ?? confidence}</span>
                    <span className="flex items-center gap-1">
                      <IconClock className="h-3 w-3" />
                      <time suppressHydrationWarning dateTime={insight.created_at}>
                        {new Date(insight.created_at).toLocaleDateString()}
                      </time>
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
