"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IconSparkles, IconClock } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { focusAfterPaint } from "@/lib/focus-utils";
import type {
  ParsedMultiAgentReview,
  ParsedAgentResponse,
} from "@/lib/validation/json-parsers";
import { parseMultiAgentReviewRow } from "@/lib/validation/json-parsers";
import type {
  AgentRole,
  InputType,
} from "@/lib/ai/multi-agent-types";
import { AGENT_LABELS, RECOMMENDATION_CONFIG } from "@/lib/ai/multi-agent-types";
import { CopyMarkdownButton } from "@/components/copy-markdown-button";
import { multiAgentReviewToMarkdown } from "@/lib/export/serialize-markdown";
import { CharacterCounter } from "@/components/ui/character-counter";
import { formatDateTime, formatDate, toISOString } from "@/lib/format-date";
import {
  MULTI_AGENT_QUESTION_MIN,
  MULTI_AGENT_QUESTION_MAX,
  MULTI_AGENT_QUESTION_QUALITY_HELPER,
} from "@/lib/validations/multi-agent";

// ── Props ───────────────────────────────────────────────────────────

interface MultiAgentClientProps {
  projectId: string;
  projectName: string;
  initialReviews: ParsedMultiAgentReview[];
}

// ── Sub-components ──────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-gray-200">
        <div
          className="h-1.5 rounded-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 tabular-nums">{pct}%</span>
    </div>
  );
}

function AgentCard({ role, response }: { role: AgentRole; response: ParsedAgentResponse }) {
  const config = AGENT_LABELS[role];
  return (
    <Card className={`border ${config.color.split(" ").slice(2).join(" ")} flex flex-col`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{config.emoji}</span>
        <h4 className="text-sm font-bold text-gray-900">{config.title}</h4>
      </div>
      <p className="text-sm text-gray-700 mb-3">{response.summary}</p>

      {response.key_points.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-1">Key Points</p>
          <ul className="space-y-1">
            {response.key_points.map((p, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                <span className="text-emerald-500 mt-0.5">+</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {response.concerns.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-1">Concerns</p>
          <ul className="space-y-1">
            {response.concerns.map((c, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                <span className="text-amber-500 mt-0.5">!</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {response.recommendations.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-1">Recommendations</p>
          <ul className="space-y-1">
            {response.recommendations.map((r, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                <span className="text-blue-500 mt-0.5">&rarr;</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto pt-3">
        <p className="text-xs text-gray-400 mb-1">Confidence</p>
        <ConfidenceBar value={response.confidence} />
      </div>
    </Card>
  );
}

function ConsensusSection({ review }: { review: ParsedMultiAgentReview }) {
  const c = review.consensus;
  const recConfig = RECOMMENDATION_CONFIG[c.recommendation as keyof typeof RECOMMENDATION_CONFIG] ?? { label: c.recommendation, variant: "default" as const };

  return (
    <Card className="border-2 border-brand-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900">Consensus</h3>
        <Badge variant={recConfig.variant}>{recConfig.label}</Badge>
      </div>

      <p className="text-sm text-gray-700 mb-4">{c.summary}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {c.disagreements.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Disagreements</p>
            <ul className="space-y-1">
              {c.disagreements.map((d, i) => (
                <li key={i} className="text-xs text-gray-600">&bull; {d}</li>
              ))}
            </ul>
          </div>
        )}

        {c.risks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Risks</p>
            <ul className="space-y-1">
              {c.risks.map((r, i) => (
                <li key={i} className="text-xs text-gray-600">&bull; {r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {c.next_steps.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Next Steps</p>
          <ol className="space-y-1">
            {c.next_steps.map((s, i) => (
              <li key={i} className="text-xs text-gray-600">{i + 1}. {s}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs text-gray-400 mb-1">Overall Confidence</p>
        <ConfidenceBar value={c.overall_confidence} />
      </div>
    </Card>
  );
}

function ReviewDetail({ review, projectName }: { review: ParsedMultiAgentReview; projectName?: string }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 break-words">{review.question}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="default">
              {review.input_type === "feature_idea" ? "Feature Idea" : "Product Question"}
            </Badge>
            {process.env.NODE_ENV === "development" && review.is_mock && (
              <Badge variant="warning">Mock review</Badge>
            )}
            <time className="flex items-center gap-1 text-xs text-gray-400" dateTime={toISOString(review.created_at)}>
              <IconClock className="h-3 w-3" />
              {formatDateTime(review.created_at)}
            </time>
          </div>
        </div>
        <div className="flex-shrink-0">
          <CopyMarkdownButton getMarkdown={() => multiAgentReviewToMarkdown(review, projectName)} />
        </div>
      </div>

      {/* Agent cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <AgentCard role="pm" response={review.pm_response} />
        <AgentCard role="cto" response={review.cto_response} />
        <AgentCard role="ux" response={review.ux_response} />
        <AgentCard role="growth" response={review.growth_response} />
      </div>

      {/* Consensus */}
      <ConsensusSection review={review} />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function MultiAgentClient({
  projectId,
  projectName,
  initialReviews,
}: MultiAgentClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ParsedMultiAgentReview[]>(initialReviews);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [inputType, setInputType] = useState<InputType>("product_question");
  const [expandedId, setExpandedId] = useState<string | null>(
    initialReviews[0]?.id ?? null,
  );
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);

  // Focus the section heading on route entry
  useEffect(() => {
    focusAfterPaint(() => sectionHeadingRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync with server props when no local operation is in-flight.
  const [prevInitial, setPrevInitial] = useState(initialReviews);
  if (initialReviews !== prevInitial && !isGenerating && isDeleting === null) {
    setPrevInitial(initialReviews);
    setReviews(initialReviews);
  }

  const validationError =
    question.length > 0 && question.length < MULTI_AGENT_QUESTION_MIN
      ? `Question must be at least ${MULTI_AGENT_QUESTION_MIN} characters`
      : null;

  async function runReview() {
    if (question.trim().length < MULTI_AGENT_QUESTION_MIN) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/multi-agent-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          question,
          inputType,
          includeContext: true,
          includeRag: true,
          includeInsights: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate review");
      }

      const data = await res.json();
      const newReview = parseMultiAgentReviewRow(data.review as Record<string, unknown>);
      setReviews((prev) => [newReview, ...prev]);
      setExpandedId(newReview.id);
      setQuestion("");
      toast("Multi-agent review complete!");
      router.refresh();
      focusAfterPaint(() => sectionHeadingRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate review");
    } finally {
      setIsGenerating(false);
    }
  }

  async function deleteReview(reviewId: string) {
    setIsDeleting(reviewId);
    setError(null);

    try {
      const res = await fetch(
        `/api/ai/multi-agent-review?projectId=${encodeURIComponent(projectId)}&reviewId=${encodeURIComponent(reviewId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete review");
      }
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      if (expandedId === reviewId) setExpandedId(null);
      toast("Review deleted");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setIsDeleting(null);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 ref={sectionHeadingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 focus:outline-none">Multi-Agent Review</h1>
        <p className="mt-1 text-sm text-gray-500">
          Get structured feedback from PM, CTO, UX, and Growth perspectives for{" "}
          <strong>{projectName}</strong>
        </p>
      </div>

      {/* Input form */}
      <Card className="mb-8">
        <div className="mb-4 flex gap-3">
          <button
            type="button"
            onClick={() => setInputType("product_question")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              inputType === "product_question"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Product Question
          </button>
          <button
            type="button"
            onClick={() => setInputType("feature_idea")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              inputType === "feature_idea"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Feature Idea
          </button>
        </div>

        <Textarea
          id="question"
          name="question"
          label={inputType === "feature_idea" ? "Describe your feature idea" : "Your product question"}
          placeholder={
            inputType === "feature_idea"
              ? "Describe your feature idea\u2026 e.g. Add a team analytics dashboard with usage heatmaps"
              : "Ask a product question\u2026 e.g. Should we prioritize Slack integration before onboarding improvements?"
          }
          value={question}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuestion(e.target.value)}
          error={validationError ?? undefined}
          maxLength={MULTI_AGENT_QUESTION_MAX}
        />

        <div className="mt-1.5 flex justify-end">
          <p className="flex-1 text-xs text-gray-400">{MULTI_AGENT_QUESTION_QUALITY_HELPER}</p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <CharacterCounter current={question.length} max={MULTI_AGENT_QUESTION_MAX} />
          <Button
            onClick={runReview}
            isLoading={isGenerating}
            disabled={isGenerating || question.trim().length < MULTI_AGENT_QUESTION_MIN}
            className="gap-2"
          >
            <IconSparkles className="h-4 w-4" />
            Run Multi-Agent Review
          </Button>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Generating state */}
      {isGenerating && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-6 text-center" role="status">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
            <IconSparkles className="h-6 w-6 text-brand-600 animate-pulse" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-brand-900">Running multi-agent review&hellip;</p>
          <p className="mt-1 text-xs text-brand-600">
            PM, CTO, UX Researcher, and Growth Marketer are evaluating your question.
          </p>
        </div>
      )}

      {/* Reviews */}
      {reviews.length === 0 && !isGenerating ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <IconSparkles className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">No reviews yet</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Enter a product question or feature idea above and click
            &ldquo;Run Multi-Agent Review&rdquo; to get expert feedback.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900">Review History</h3>
          {reviews.map((review) => {
            const isExpanded = expandedId === review.id;
            const recConfig = RECOMMENDATION_CONFIG[review.consensus.recommendation as keyof typeof RECOMMENDATION_CONFIG] ?? {
              label: review.consensus.recommendation,
              variant: "default" as const,
            };

            return (
              <div key={review.id}>
                {/* Summary row */}
                <div
                  className="w-full text-left rounded-xl border border-gray-200 bg-white px-5 py-4 transition hover:border-gray-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : review.id)}
                      className="flex-1 min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                    >
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {review.question}
                      </p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <Badge variant={recConfig.variant}>{recConfig.label}</Badge>
                        <Badge variant="default">
                          {review.input_type === "feature_idea" ? "Feature" : "Question"}
                        </Badge>
                        {process.env.NODE_ENV === "development" && review.is_mock && (
                          <Badge variant="warning">Mock</Badge>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <IconClock className="h-3 w-3" />
                          <time dateTime={toISOString(review.created_at)}>
                            {formatDate(review.created_at)}
                          </time>
                        </span>
                      </div>
                    </button>
                    <div className="ml-4 flex items-center gap-2">
                      <ConfirmDialog
                        title="Delete this review?"
                        message="This will permanently delete this multi-agent review. This action cannot be undone."
                        confirmLabel="Delete Review"
                        variant="danger"
                        onConfirm={() => deleteReview(review.id)}
                        focusFallbackRef={sectionHeadingRef}
                        trigger={
                          <button
                            type="button"
                            className="text-xs text-gray-400 hover:text-red-500 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded px-1"
                            disabled={isDeleting === review.id}
                            aria-label={`Delete review: ${review.question}`}
                          >
                            {isDeleting === review.id ? "Deleting\u2026" : "Delete"}
                          </button>
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : review.id)}
                        className="text-gray-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                        aria-label={isExpanded ? "Collapse review" : "Expand review"}
                      >
                        {isExpanded ? "\u25B2" : "\u25BC"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 ml-2 mr-2">
                    <ReviewDetail review={review} projectName={projectName} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

