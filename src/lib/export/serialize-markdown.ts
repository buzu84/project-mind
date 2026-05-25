import type { MultiAgentReview, AgentRole, AgentResponse } from "@/lib/ai/multi-agent-types";
import { AGENT_LABELS, RECOMMENDATION_CONFIG } from "@/lib/ai/multi-agent-types";
import type { Roadmap, RoadmapItem } from "@/lib/ai/roadmap-types";

// ── Decision Review ────────────────────────────────────────────────

interface DecisionExportData {
  title: string;
  status: string;
  category: string;
  confidenceScore: number | null;
  problemStatement: string | null;
  contextSummary: string | null;
  recommendation: {
    recommendation: string;
    confidence_score: number | null;
    reasoning: string | string[];
    next_validation_steps: string[];
  } | null;
  options: {
    title: string;
    description: string | null;
    pros: string[];
    cons: string[];
    effort_estimate: string | null;
    reversibility: string | null;
    confidence_score: number | null;
  }[];
  assumptions: {
    statement: string;
    assumption_type: string | null;
    risk_level: string | null;
    evidence_status: string | null;
    validation_method: string | null;
  }[];
  evidence: {
    title: string | null;
    claim: string;
    source_type: string;
  }[];
}

export function decisionReviewToMarkdown(data: DecisionExportData): string {
  const lines: string[] = [];

  lines.push(`# Decision Review: ${data.title}`);
  lines.push("");
  lines.push(`**Status:** ${data.status.replace("_", " ")}  `);
  lines.push(`**Category:** ${data.category}  `);
  if (data.confidenceScore != null) {
    lines.push(`**Confidence:** ${data.confidenceScore}%  `);
  }
  lines.push("");

  if (data.problemStatement) {
    lines.push("## Problem Statement");
    lines.push("");
    lines.push(data.problemStatement);
    lines.push("");
  }

  if (data.contextSummary) {
    lines.push("## Context");
    lines.push("");
    lines.push(data.contextSummary);
    lines.push("");
  }

  if (data.recommendation) {
    lines.push("## Recommendation");
    lines.push("");
    lines.push(data.recommendation.recommendation);
    if (data.recommendation.confidence_score != null) {
      lines.push("");
      lines.push(`*Confidence: ${data.recommendation.confidence_score}%*`);
    }
    lines.push("");

    const reasoning = Array.isArray(data.recommendation.reasoning)
      ? data.recommendation.reasoning
      : typeof data.recommendation.reasoning === "string" && data.recommendation.reasoning.trim()
        ? data.recommendation.reasoning.split("\n").filter(Boolean)
        : [];

    if (reasoning.length > 0) {
      lines.push("### Reasoning");
      lines.push("");
      reasoning.forEach((r) => lines.push(`- ${r}`));
      lines.push("");
    }

    if (data.recommendation.next_validation_steps?.length > 0) {
      lines.push("### Next Steps");
      lines.push("");
      data.recommendation.next_validation_steps.forEach((s) => lines.push(`- ${s}`));
      lines.push("");
    }
  }

  if (data.options.length > 0) {
    lines.push("## Decision Options");
    lines.push("");
    data.options.forEach((opt, i) => {
      lines.push(`### Option ${i + 1}: ${opt.title}`);
      lines.push("");
      if (opt.description) lines.push(opt.description);
      if (opt.effort_estimate) lines.push(`**Effort:** ${opt.effort_estimate}`);
      if (opt.reversibility && opt.reversibility !== "unknown") lines.push(`**Reversibility:** ${opt.reversibility}`);
      if (opt.confidence_score != null) lines.push(`**Confidence:** ${opt.confidence_score}%`);
      lines.push("");
      if (opt.pros.length > 0) {
        lines.push("**Pros:**");
        opt.pros.forEach((p) => lines.push(`- ${p}`));
        lines.push("");
      }
      if (opt.cons.length > 0) {
        lines.push("**Cons:**");
        opt.cons.forEach((c) => lines.push(`- ${c}`));
        lines.push("");
      }
    });
  }

  if (data.assumptions.length > 0) {
    lines.push("## Assumptions");
    lines.push("");
    data.assumptions.forEach((a) => {
      const tags = [
        a.assumption_type,
        a.risk_level ? `${a.risk_level} risk` : null,
        a.evidence_status,
      ].filter(Boolean).join(" · ");
      lines.push(`- ${a.statement}${tags ? ` *(${tags})*` : ""}`);
      if (a.validation_method) lines.push(`  - Validation: ${a.validation_method}`);
    });
    lines.push("");
  }

  if (data.evidence.length > 0) {
    lines.push("## Evidence");
    lines.push("");
    data.evidence.forEach((ev) => {
      const label = ev.title ? `**${ev.title}** (${ev.source_type})` : `*(${ev.source_type})*`;
      lines.push(`- ${label}: ${ev.claim}`);
    });
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

// ── Multi-Agent Review ─────────────────────────────────────────────

function agentSectionToMarkdown(role: AgentRole, response: AgentResponse): string {
  const config = AGENT_LABELS[role];
  const lines: string[] = [];

  lines.push(`### ${config.emoji} ${config.title}`);
  lines.push("");
  lines.push(response.summary);
  lines.push("");

  if (response.key_points.length > 0) {
    lines.push("**Key Points:**");
    response.key_points.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }

  if (response.concerns.length > 0) {
    lines.push("**Concerns:**");
    response.concerns.forEach((c) => lines.push(`- ${c}`));
    lines.push("");
  }

  if (response.recommendations.length > 0) {
    lines.push("**Recommendations:**");
    response.recommendations.forEach((r) => lines.push(`- ${r}`));
    lines.push("");
  }

  lines.push(`*Confidence: ${Math.round(response.confidence * 100)}%*`);
  lines.push("");

  return lines.join("\n");
}

export function multiAgentReviewToMarkdown(review: MultiAgentReview, projectName?: string): string {
  const recConfig = RECOMMENDATION_CONFIG[review.consensus.recommendation];
  const lines: string[] = [];

  lines.push(`# Multi-Agent Review`);
  lines.push("");
  if (projectName) {
    lines.push(`## Project`);
    lines.push("");
    lines.push(projectName);
    lines.push("");
  }
  lines.push(`## Review Topic`);
  lines.push("");
  lines.push(review.question);
  lines.push("");
  lines.push(`**Type:** ${review.input_type === "feature_idea" ? "Feature Idea" : "Product Question"}  `);
  lines.push(`**Generated:** ${new Date(review.created_at).toLocaleDateString()}  `);
  lines.push("");

  lines.push("## Agent Perspectives");
  lines.push("");

  const roles: AgentRole[] = ["pm", "cto", "ux", "growth"];
  const responseMap: Record<AgentRole, AgentResponse> = {
    pm: review.pm_response,
    cto: review.cto_response,
    ux: review.ux_response,
    growth: review.growth_response,
  };

  for (const role of roles) {
    lines.push(agentSectionToMarkdown(role, responseMap[role]));
  }

  lines.push("## Consensus");
  lines.push("");
  lines.push(`**Recommendation:** ${recConfig?.label ?? review.consensus.recommendation}  `);
  lines.push(`**Overall Confidence:** ${Math.round(review.consensus.overall_confidence * 100)}%  `);
  lines.push("");
  lines.push(review.consensus.summary);
  lines.push("");

  if (review.consensus.disagreements.length > 0) {
    lines.push("### Disagreements");
    lines.push("");
    review.consensus.disagreements.forEach((d) => lines.push(`- ${d}`));
    lines.push("");
  }

  if (review.consensus.risks.length > 0) {
    lines.push("### Risks");
    lines.push("");
    review.consensus.risks.forEach((r) => lines.push(`- ${r}`));
    lines.push("");
  }

  if (review.consensus.next_steps.length > 0) {
    lines.push("### Next Steps");
    lines.push("");
    review.consensus.next_steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

// ── Roadmap ────────────────────────────────────────────────────────

function roadmapItemsToMarkdown(items: RoadmapItem[]): string {
  return items
    .map((item) => {
      const tags = [item.priority, item.confidence ? `confidence: ${item.confidence}` : null]
        .filter(Boolean)
        .join(" · ");
      return `- **${item.title}** — ${item.description}${tags ? ` *(${tags})*` : ""}`;
    })
    .join("\n");
}

export function roadmapToMarkdown(roadmap: Roadmap, projectName?: string): string {
  const lines: string[] = [];

  lines.push(`# AI Roadmap${projectName ? ` — ${projectName}` : ""}`);
  lines.push("");
  lines.push(`**${roadmap.title}**`);
  lines.push("");
  lines.push(`**Generated:** ${new Date(roadmap.created_at).toLocaleDateString()}  `);
  lines.push("");

  // Now / Next / Later
  const horizons: [string, RoadmapItem[]][] = [
    ["Now", roadmap.now_items ?? []],
    ["Next", roadmap.next_items ?? []],
    ["Later", roadmap.later_items ?? []],
  ];
  if (horizons.some(([, items]) => items.length > 0)) {
    lines.push("## Priority Horizons");
    lines.push("");
    for (const [label, items] of horizons) {
      if (items.length > 0) {
        lines.push(`### ${label}`);
        lines.push("");
        lines.push(roadmapItemsToMarkdown(items));
        lines.push("");
      }
    }
  }

  // 30/60/90
  const plans: [string, RoadmapItem[]][] = [
    ["First 30 Days", roadmap.plan_30_days ?? []],
    ["Days 31–60", roadmap.plan_60_days ?? []],
    ["Days 61–90", roadmap.plan_90_days ?? []],
  ];
  if (plans.some(([, items]) => items.length > 0)) {
    lines.push("## 30 / 60 / 90 Day Plan");
    lines.push("");
    for (const [label, items] of plans) {
      if (items.length > 0) {
        lines.push(`### ${label}`);
        lines.push("");
        lines.push(roadmapItemsToMarkdown(items));
        lines.push("");
      }
    }
  }

  // Risks, Dependencies, Metrics
  const sections: [string, RoadmapItem[]][] = [
    ["Risks", roadmap.risks ?? []],
    ["Dependencies", roadmap.dependencies ?? []],
    ["Success Metrics", roadmap.success_metrics ?? []],
  ];
  for (const [label, items] of sections) {
    if (items.length > 0) {
      lines.push(`## ${label}`);
      lines.push("");
      lines.push(roadmapItemsToMarkdown(items));
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

// ── Insights ───────────────────────────────────────────────────────

interface InsightExportData {
  type: string;
  title: string;
  content: string;
  metadata: {
    priority: string;
    confidence: string;
    suggested_action: string;
  } | null;
}

const INSIGHT_TYPE_LABELS: Record<string, string> = {
  risk: "Risk",
  opportunity: "Opportunity",
  next_action: "Next Action",
  roadmap: "Roadmap",
  assumption: "Assumption",
  pain_point: "Pain Point",
  strategic_gap: "Strategic Gap",
};

export function insightsToMarkdown(insights: InsightExportData[], projectName: string): string {
  if (insights.length === 0) return "";

  const lines: string[] = [];

  lines.push(`# AI Insights — ${projectName}`);
  lines.push("");

  insights.forEach((insight) => {
    const typeLabel = INSIGHT_TYPE_LABELS[insight.type] ?? insight.type;
    const priority = insight.metadata?.priority ?? "medium";
    const confidence = insight.metadata?.confidence;
    lines.push(`## ${insight.title}`);
    lines.push("");
    lines.push(`**Type:** ${typeLabel} · **Priority:** ${priority}${confidence ? ` · **Confidence:** ${confidence}` : ""}  `);
    lines.push("");
    lines.push(insight.content);
    if (insight.metadata?.suggested_action) {
      lines.push("");
      lines.push(`> 🎯 **Suggested action:** ${insight.metadata.suggested_action}`);
    }
    lines.push("");
  });

  return lines.join("\n").trimEnd() + "\n";
}

