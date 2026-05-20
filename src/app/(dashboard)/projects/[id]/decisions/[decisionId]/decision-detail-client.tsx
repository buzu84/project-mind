"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { IconSparkles } from "@/components/icons";

type R = Record<string, any>;

interface Props {
  projectId: string;
  decision: R;
  options: R[];
  assumptions: R[];
  recommendation: R | null;
  evidenceLinks: R[];
}

const statusBadgeVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  draft: "default",
  under_review: "info",
  accepted: "success",
  rejected: "danger",
  revisit: "warning",
};

const riskColors: Record<string, string> = {
  low: "text-green-700 bg-green-50",
  medium: "text-yellow-700 bg-yellow-50",
  high: "text-red-700 bg-red-50",
};

export function DecisionDetailClient({
  projectId,
  decision,
  options: initialOptions,
  assumptions: initialAssumptions,
  recommendation: initialRecommendation,
  evidenceLinks: initialEvidence,
}: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [options] = useState(initialOptions);
  const [assumptions] = useState(initialAssumptions);
  const [recommendation] = useState(initialRecommendation);
  const [evidenceLinks] = useState(initialEvidence);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(
    decision.confidence_score ?? null,
  );
  const { toast } = useToast();
  const router = useRouter();

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/decisions/${decision.id}/analyze`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Analysis failed.");
      }
      const result = await res.json();
      toast("Decision analyzed successfully");
      setConfidenceScore(result.confidenceScore ?? null);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not analyze decision.";
      toast(msg, "error");
    } finally {
      setAnalyzing(false);
    }
  }

  const hasAnalysis = recommendation !== null || options.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{String(decision.title ?? "")}</h2>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={statusBadgeVariant[String(decision.status ?? "draft")] ?? "default"}>
              {String(decision.status ?? "draft").replace("_", " ")}
            </Badge>
            <Badge>{String(decision.category ?? "other")}</Badge>
            {confidenceScore !== null && (
              <span className="text-sm text-gray-500">
                Confidence: <strong>{confidenceScore}%</strong>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="gap-1.5"
          >
            <IconSparkles className="h-4 w-4" />
            {analyzing ? "Analyzing…" : hasAnalysis ? "Re-Analyze" : "Analyze Decision"}
          </Button>
          {!hasAnalysis && !analyzing && (
            <p className="text-[11px] text-gray-400 text-right max-w-[220px]">
              Uses project context and uploaded evidence to generate options, assumptions, risks, and a recommendation.
            </p>
          )}
        </div>
      </div>

      {analyzing && (
        <Card className="border-brand-200 bg-brand-50 text-center py-8">
          <IconSparkles className="mx-auto h-7 w-7 text-brand-600 animate-pulse" />
          <p className="mt-2 text-sm font-medium text-brand-900">Analyzing decision…</p>
          <p className="mt-1 text-xs text-brand-600">
            Retrieving project evidence, evaluating options, and generating a structured recommendation.
          </p>
        </Card>
      )}

      {/* Problem statement */}
      {decision.problem_statement && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Problem Statement</h3>
          <p className="text-sm text-gray-600">{String(decision.problem_statement)}</p>
        </Card>
      )}

      {decision.context_summary && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Context</h3>
          <p className="text-sm text-gray-600">{String(decision.context_summary)}</p>
        </Card>
      )}

      {/* Recommendation */}
      {recommendation && (
        <Card className="border-blue-200 bg-blue-50/30">
          <h3 className="text-base font-semibold text-blue-900 mb-2">
            💡 Recommendation
            {recommendation.confidence_score != null && (
              <span className="ml-2 text-sm font-normal text-blue-600">
                ({String(recommendation.confidence_score)}% confidence)
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-800 mb-3">{String(recommendation.recommendation ?? "")}</p>

          {(() => {
            const reasoningRaw = recommendation.reasoning;
            const reasoningList: string[] = Array.isArray(reasoningRaw)
              ? reasoningRaw
              : typeof reasoningRaw === "string" && reasoningRaw.trim()
                ? reasoningRaw.split("\n").filter(Boolean)
                : [];
            return reasoningList.length > 0 ? (
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Reasoning</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                  {reasoningList.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            ) : null;
          })()}

          {Array.isArray(recommendation.next_validation_steps) && recommendation.next_validation_steps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Next Steps</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                {(recommendation.next_validation_steps as string[]).map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Options */}
      {options.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Decision Options</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {options.map((opt: R) => (
              <Card key={String(opt.id)}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{String(opt.title)}</h4>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {opt.effort_estimate && (
                      <Badge variant="default">
                        {String(opt.effort_estimate)} effort
                      </Badge>
                    )}
                    {opt.reversibility && String(opt.reversibility) !== "unknown" && (
                      <Badge variant="default">
                        {String(opt.reversibility)} reversibility
                      </Badge>
                    )}
                    {opt.confidence_score != null && (
                      <span className="text-xs text-gray-400">{String(opt.confidence_score)}%</span>
                    )}
                  </div>
                </div>
                {opt.description && (
                  <p className="text-xs text-gray-600 mb-2">{String(opt.description)}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Array.isArray(opt.pros) && opt.pros.length > 0 && (
                    <div>
                      <span className="font-semibold text-green-700">Pros</span>
                      <ul className="mt-0.5 space-y-0.5 text-gray-600">
                        {(opt.pros as string[]).map((p: string, i: number) => <li key={i}>+ {p}</li>)}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(opt.cons) && opt.cons.length > 0 && (
                    <div>
                      <span className="font-semibold text-red-700">Cons</span>
                      <ul className="mt-0.5 space-y-0.5 text-gray-600">
                        {(opt.cons as string[]).map((c: string, i: number) => <li key={i}>− {c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Assumptions */}
      {assumptions.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Assumptions</h3>
          <div className="space-y-2">
            {assumptions.map((a: R) => (
              <Card key={String(a.id)} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-800">{String(a.statement)}</p>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {a.assumption_type && (
                      <Badge variant="default">{String(a.assumption_type)}</Badge>
                    )}
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${riskColors[String(a.risk_level ?? "medium")]}`}>
                      {String(a.risk_level ?? "medium")} risk
                    </span>
                    <Badge variant="default">{String(a.evidence_status ?? "unsupported")}</Badge>
                  </div>
                </div>
                {a.validation_method && (
                  <p className="mt-1 text-xs text-gray-500">
                    Validation: {String(a.validation_method)}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Evidence */}
      {evidenceLinks.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Evidence</h3>
          <div className="space-y-2">
            {evidenceLinks.map((link: R) => {
              const ev = (link.product_evidence ?? {}) as R;
              return (
                <Card key={String(link.id)} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {ev.title && <p className="text-xs font-semibold text-gray-700">{String(ev.title)}</p>}
                      <p className="text-sm text-gray-600 line-clamp-2">{String(ev.claim ?? "")}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Badge variant="default">{String(ev.source_type ?? "unknown")}</Badge>
                      {ev.relevance_score != null && (
                        <span className="text-xs text-gray-400">
                          {(Number(ev.relevance_score) * 100).toFixed(0)}% relevant
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAnalysis && !analyzing && (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <IconSparkles className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-700">No analysis yet</p>
          <p className="mt-1 text-xs text-gray-500 max-w-sm">
            Click &quot;Analyze Decision&quot; to generate AI-powered options, assumptions, risks, and a recommendation.
          </p>
        </Card>
      )}
    </div>
  );
}


