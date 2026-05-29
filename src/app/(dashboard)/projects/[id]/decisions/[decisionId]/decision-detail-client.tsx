"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { IconSparkles } from "@/components/icons";
import { CopyMarkdownButton } from "@/components/copy-markdown-button";
import { decisionReviewToMarkdown } from "@/lib/export/serialize-markdown";
import { focusAfterPaint } from "@/lib/focus-utils";
import type {
  DecisionViewModel,
  OptionViewModel,
  AssumptionViewModel,
  RecommendationViewModel,
  EvidenceLinkViewModel,
} from "./decision-view-models";

interface Props {
  projectId: string;
  decision: DecisionViewModel;
  options: OptionViewModel[];
  assumptions: AssumptionViewModel[];
  recommendation: RecommendationViewModel | null;
  evidenceLinks: EvidenceLinkViewModel[];
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
  options,
  assumptions,
  recommendation,
  evidenceLinks,
}: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  // Optimistic confidence score: updated immediately from the analyze API
  // response, then synced with server-provided props after router.refresh().
  const [optimisticScore, setOptimisticScore] = useState<number | null>(null);
  const confidenceScore = optimisticScore ?? decision.confidence_score;
  const { toast } = useToast();
  const router = useRouter();
  const analyzeButtonRef = useRef<HTMLButtonElement>(null);
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);

  // Focus the section heading on route entry
  useEffect(() => {
    focusAfterPaint(() => sectionHeadingRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      setOptimisticScore(result.confidenceScore ?? null);
      router.refresh();
      focusAfterPaint(() => analyzeButtonRef.current);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not analyze decision.";
      toast(msg, "error");
    } finally {
      setAnalyzing(false);
    }
  }

  const hasAnalysis = recommendation !== null || options.length > 0;

  // Stale-state: analysis is outdated if the decision was edited after
  // the most recent recommendation was generated.
  // The analysis pipeline itself updates decision.updated_at (to persist the
  // new confidence_score), so we add a small buffer (30 s) to avoid false
  // positives from the pipeline's own writes.
  const STALE_BUFFER_MS = 30_000;
  const isAnalysisStale =
    hasAnalysis &&
    recommendation !== null &&
    new Date(decision.updated_at).getTime() - new Date(recommendation.created_at).getTime() > STALE_BUFFER_MS;

  const analyzeCta = analyzing
    ? "Analyzing…"
    : hasAnalysis
      ? "Re-Analyze"
      : "Analyze Decision";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 ref={sectionHeadingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 break-words focus:outline-none">{decision.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={statusBadgeVariant[decision.status] ?? "default"}>
              {decision.status.replace("_", " ")}
            </Badge>
            <Badge>{decision.category}</Badge>
            {confidenceScore !== null && (
              <span className="text-sm text-gray-500">
                Confidence: <strong>{confidenceScore}%</strong>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {hasAnalysis && (
              <CopyMarkdownButton
                getMarkdown={() =>
                  decisionReviewToMarkdown({
                    title: decision.title,
                    status: decision.status,
                    category: decision.category,
                    confidenceScore,
                    problemStatement: decision.problem_statement,
                    contextSummary: decision.context_summary,
                    recommendation: recommendation
                      ? {
                          recommendation: recommendation.recommendation,
                          confidence_score: recommendation.confidence_score,
                          reasoning: recommendation.reasoning,
                          next_validation_steps: recommendation.next_validation_steps,
                        }
                      : null,
                    options: options.map((opt) => ({
                      title: opt.title,
                      description: opt.description,
                      pros: opt.pros,
                      cons: opt.cons,
                      effort_estimate: opt.effort_estimate,
                      reversibility: opt.reversibility,
                      confidence_score: opt.confidence_score,
                    })),
                    assumptions: assumptions.map((a) => ({
                      statement: a.statement,
                      assumption_type: a.assumption_type,
                      risk_level: a.risk_level,
                      evidence_status: a.evidence_status,
                      validation_method: a.validation_method,
                    })),
                    evidence: evidenceLinks.map((link) => ({
                      title: link.evidence.title,
                      claim: link.evidence.claim,
                      source_type: link.evidence.source_type,
                    })),
                  })
                }
              />
            )}
            <Button
              ref={analyzeButtonRef}
              onClick={handleAnalyze}
              disabled={analyzing}
              className="gap-1.5"
            >
              <IconSparkles className="h-4 w-4" />
              {analyzeCta}
            </Button>
          </div>
          {!hasAnalysis && !analyzing && (
            <p className="text-[11px] text-gray-400 text-right max-w-[220px]">
              Uses project context and uploaded evidence to generate options, assumptions, risks, and a recommendation.
            </p>
          )}
        </div>
      </div>

      {/* Stale analysis indicator */}
      {isAnalysisStale && !analyzing && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-700" role="status">
          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3l9.66 16.5H2.34L12 3z" />
          </svg>
          <span>
            This decision was edited after the analysis was generated. Consider re-analyzing for up-to-date results.
          </span>
        </div>
      )}

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
          <p className="text-sm text-gray-600">{decision.problem_statement}</p>
        </Card>
      )}

      {decision.context_summary && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Context</h3>
          <p className="text-sm text-gray-600">{decision.context_summary}</p>
        </Card>
      )}

      {/* Recommendation */}
      {recommendation && (
        <Card className="border-blue-200 bg-blue-50/30">
          <h3 className="text-base font-semibold text-blue-900 mb-2">
            💡 Recommendation
            {recommendation.confidence_score != null && (
              <span className="ml-2 text-sm font-normal text-blue-600">
                ({recommendation.confidence_score}% confidence)
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-800 mb-3">{recommendation.recommendation}</p>

          {recommendation.reasoning.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Reasoning</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                {recommendation.reasoning.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {recommendation.next_validation_steps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Next Steps</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                {recommendation.next_validation_steps.map((s, i) => <li key={i}>{s}</li>)}
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
            {options.map((opt) => (
              <Card key={opt.id}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{opt.title}</h4>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {opt.effort_estimate && (
                      <Badge variant="default">
                        {opt.effort_estimate} effort
                      </Badge>
                    )}
                    {opt.reversibility && opt.reversibility !== "unknown" && (
                      <Badge variant="default">
                        {opt.reversibility} reversibility
                      </Badge>
                    )}
                    {opt.confidence_score != null && (
                      <span className="text-xs text-gray-400">{opt.confidence_score}%</span>
                    )}
                  </div>
                </div>
                {opt.description && (
                  <p className="text-xs text-gray-600 mb-2">{opt.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {opt.pros.length > 0 && (
                    <div>
                      <span className="font-semibold text-green-700">Pros</span>
                      <ul className="mt-0.5 space-y-0.5 text-gray-600">
                        {opt.pros.map((p, i) => <li key={i}>+ {p}</li>)}
                      </ul>
                    </div>
                  )}
                  {opt.cons.length > 0 && (
                    <div>
                      <span className="font-semibold text-red-700">Cons</span>
                      <ul className="mt-0.5 space-y-0.5 text-gray-600">
                        {opt.cons.map((c, i) => <li key={i}>− {c}</li>)}
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
            {assumptions.map((a) => (
              <Card key={a.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-800">{a.statement}</p>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {a.assumption_type && (
                      <Badge variant="default">{a.assumption_type}</Badge>
                    )}
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${riskColors[a.risk_level] ?? ""}`}>
                      {a.risk_level} risk
                    </span>
                    <Badge variant="default">{a.evidence_status ?? "unsupported"}</Badge>
                  </div>
                </div>
                {a.validation_method && (
                  <p className="mt-1 text-xs text-gray-500">
                    Validation: {a.validation_method}
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
            {evidenceLinks.map((link) => (
              <Card key={link.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {link.evidence.title && <p className="text-xs font-semibold text-gray-700">{link.evidence.title}</p>}
                    <p className="text-sm text-gray-600 line-clamp-2">{link.evidence.claim}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Badge variant="default">{link.evidence.source_type}</Badge>
                    {link.evidence.relevance_score != null && (
                      <span className="text-xs text-gray-400">
                        {(link.evidence.relevance_score * 100).toFixed(0)}% relevant
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
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
