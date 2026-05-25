"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IconSparkles, IconClock } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import type {
  MultiAgentReview,
  AgentRole,
  AgentResponse,
  InputType,
} from "@/lib/ai/multi-agent-types";
import { AGENT_LABELS, RECOMMENDATION_CONFIG } from "@/lib/ai/multi-agent-types";
import { CopyMarkdownButton } from "@/components/copy-markdown-button";
import { multiAgentReviewToMarkdown } from "@/lib/export/serialize-markdown";

// ── Props ───────────────────────────────────────────────────────────

interface MultiAgentClientProps {
  projectId: string;
  projectName: string;
  initialReviews: MultiAgentReview[];
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

function AgentCard({ role, response }: { role: AgentRole; response: AgentResponse }) {
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

function ConsensusSection({ review }: { review: MultiAgentReview }) {
  const c = review.consensus;
  const recConfig = RECOMMENDATION_CONFIG[c.recommendation] ?? { label: c.recommendation, variant: "default" as const };

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

function ReviewDetail({ review, projectName }: { review: MultiAgentReview; projectName?: string }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{review.question}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="default">
              {review.input_type === "feature_idea" ? "Feature Idea" : "Product Question"}
            </Badge>
            {process.env.NODE_ENV === "development" && review.is_mock && (
              <Badge variant="warning">Mock review</Badge>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <IconClock className="h-3 w-3" />
              {new Date(review.created_at).toLocaleString()}
            </span>
          </div>
        </div>
        <CopyMarkdownButton getMarkdown={() => multiAgentReviewToMarkdown(review, projectName)} />
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
  const [reviews, setReviews] = useState<MultiAgentReview[]>(initialReviews);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [inputType, setInputType] = useState<InputType>("product_question");
  const [expandedId, setExpandedId] = useState<string | null>(
    initialReviews[0]?.id ?? null,
  );

  const validationError =
    question.length > 0 && question.length < 10
      ? "Question must be at least 10 characters"
      : null;

  async function runReview() {
    if (question.length < 10) return;
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
      const newReview = data.review as MultiAgentReview;
      setReviews((prev) => [newReview, ...prev]);
      setExpandedId(newReview.id);
      setQuestion("");
      toast("Multi-agent review complete!");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate review");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Multi-Agent Review</h2>
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
        />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-400">{question.length}/3000</span>
          <Button
            onClick={runReview}
            isLoading={isGenerating}
            disabled={isGenerating || question.length < 10}
            className="gap-2"
          >
            <IconSparkles className="h-4 w-4" />
            Run Multi-Agent Review
          </Button>
        </div>
      </Card>

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
            const recConfig = RECOMMENDATION_CONFIG[review.consensus.recommendation] ?? {
              label: review.consensus.recommendation,
              variant: "default" as const,
            };

            return (
              <div key={review.id}>
                {/* Summary row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : review.id)}
                  className="w-full text-left rounded-xl border border-gray-200 bg-white px-5 py-4 transition hover:border-gray-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
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
                          <time suppressHydrationWarning dateTime={review.created_at}>
                            {new Date(review.created_at).toLocaleDateString()}
                          </time>
                        </span>
                      </div>
                    </div>
                    <span className="ml-4 text-gray-400 text-sm">
                      {isExpanded ? "\u25B2" : "\u25BC"}
                    </span>
                  </div>
                </button>

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

