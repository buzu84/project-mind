import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { retrieveRelevantContext } from "@/lib/rag";
import { generateMockMultiAgentReview } from "@/lib/ai/mock-multi-agent";
import { trackAIUsage, trackAIUsageError } from "@/lib/ai/usage-tracking";
import { isRealAI } from "@/lib/ai/is-real-ai";
import { checkHeavyAILimit, rateLimitResponse } from "@/lib/ai/rate-limiter";
import type { AgentResponse, ConsensusResponse, AgentRole } from "@/lib/ai/multi-agent-types";

// ── Helpers ─────────────────────────────────────────────────────────


function hasOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// ── Input ───────────────────────────────────────────────────────────

const schema = z.object({
  projectId: z.string().min(1),
  question: z.string().min(10).max(3000),
  inputType: z.enum(["product_question", "feature_idea"]),
  includeContext: z.boolean().optional().default(true),
  includeRag: z.boolean().optional().default(true),
  includeInsights: z.boolean().optional().default(true),
});

// ── Prompts ─────────────────────────────────────────────────────────

const PERSONA_PROMPTS: Record<AgentRole, string> = {
  pm: `You are a senior Product Manager. Evaluate from: user value, prioritization, roadmap fit, business impact, trade-offs.`,
  cto: `You are a CTO / VP Engineering. Evaluate from: technical complexity, architecture impact, scalability, security, delivery risk, dependencies.`,
  ux: `You are a UX Researcher. Evaluate from: user needs, usability, research assumptions, accessibility, onboarding friction, validation methods.`,
  growth: `You are a Growth Marketer. Evaluate from: acquisition, activation, retention, monetization, positioning, experimentation.`,
};

const AGENT_RESPONSE_SCHEMA = `Return ONLY a JSON object:
{
  "summary": "2-3 sentence evaluation",
  "key_points": ["point1", "point2", ...],
  "concerns": ["concern1", ...],
  "recommendations": ["rec1", ...],
  "confidence": 0.0-1.0
}`;

const CONSENSUS_PROMPT = `You are a senior product strategist synthesizing feedback from four experts (PM, CTO, UX Researcher, Growth Marketer).

Given their responses, produce a consensus. Return ONLY JSON:
{
  "recommendation": "strongly_recommend" | "recommend" | "neutral" | "not_recommended" | "needs_more_research",
  "summary": "2-3 sentence synthesis",
  "disagreements": ["where experts disagree"],
  "risks": ["key risks identified"],
  "next_steps": ["concrete next actions"],
  "overall_confidence": 0.0-1.0
}`;

// ── Context builder ─────────────────────────────────────────────────

function buildContext(
  project: Record<string, string | null>,
  context: Record<string, string | null> | null,
  ragContext: string,
  insightsSummary: string | null,
): string {
  const parts: string[] = [];
  if (project.name) parts.push("Project: " + project.name);
  if (project.description) parts.push("Description: " + project.description);
  if (project.target_users) parts.push("Target Users: " + project.target_users);
  if (project.market) parts.push("Market: " + project.market);
  if (project.business_model) parts.push("Business Model: " + project.business_model);
  if (project.goals) parts.push("Goals: " + project.goals);

  if (context) {
    const labels: Record<string, string> = {
      product_overview: "Product Overview",
      target_personas: "Target Personas",
      current_metrics: "Current Metrics",
      pain_points: "Known Pain Points",
      strategic_goals: "Strategic Goals",
    };
    for (const [key, label] of Object.entries(labels)) {
      if (context[key]) parts.push(label + ": " + context[key]);
    }
  }

  if (ragContext) parts.push(ragContext);
  if (insightsSummary) parts.push("\nExisting Insights:\n" + insightsSummary);

  return parts.join("\n");
}

// ── Real AI generation ──────────────────────────────────────────────

async function generateAgentResponse(
  role: AgentRole,
  question: string,
  inputType: string,
  projectContext: string,
): Promise<AgentResponse> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `${PERSONA_PROMPTS[role]}\n\n${AGENT_RESPONSE_SCHEMA}`,
      },
      {
        role: "user",
        content: `Project context:\n${projectContext}\n\n${inputType === "feature_idea" ? "Feature idea" : "Product question"}:\n${question}`,
      },
    ],
    temperature: 0.6,
    max_tokens: 1024,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return {
    summary: parsed.summary ?? "",
    key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
    concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
  };
}

async function generateConsensus(
  question: string,
  responses: Record<AgentRole, AgentResponse>,
): Promise<ConsensusResponse> {
  const agentSummary = Object.entries(responses)
    .map(([role, r]) => `${role.toUpperCase()}:\nSummary: ${r.summary}\nConcerns: ${r.concerns.join("; ")}\nConfidence: ${r.confidence}`)
    .join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: CONSENSUS_PROMPT },
      { role: "user", content: `Question: ${question}\n\nAgent responses:\n${agentSummary}` },
    ],
    temperature: 0.5,
    max_tokens: 1024,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return {
    recommendation: parsed.recommendation ?? "neutral",
    summary: parsed.summary ?? "",
    disagreements: Array.isArray(parsed.disagreements) ? parsed.disagreements : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
    overall_confidence: typeof parsed.overall_confidence === "number" ? Math.min(1, Math.max(0, parsed.overall_confidence)) : 0.5,
  };
}

// ── POST handler ────────────────────────────────────────────────────

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkHeavyAILimit(user);
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { projectId, question, inputType, includeContext, includeRag, includeInsights } = parsed.data;
  const supabase = createClient();
  const isReal = isRealAI();
  const isMock = !isReal;

  // Fetch project
  const { data: project } = await supabase
    .from("projects")
    .select("name, description, target_users, market, business_model, goals")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Fetch context data in parallel
  const [contextRes, insightsRes, ragResult] = await Promise.all([
    includeContext
      ? supabase.from("project_context")
          .select("product_overview, target_personas, current_metrics, pain_points, strategic_goals")
          .eq("project_id", projectId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    includeInsights
      ? supabase.from("insights")
          .select("type, title, content")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    includeRag
      ? retrieveRelevantContext(question, projectId, user.id).catch(() => ({ context: "", results: [] }))
      : Promise.resolve({ context: "", results: [] }),
  ]);

  const insightsList = ((insightsRes as any).data ?? []) as Array<{ type: string; title: string; content: string }>;
  const insightsSummary = insightsList.length > 0
    ? insightsList.map((i) => `[${i.type}] ${i.title}: ${i.content}`).join("\n")
    : null;

  const projectContext = buildContext(
    project as Record<string, string | null>,
    (contextRes as any).data as Record<string, string | null> | null,
    (ragResult as any).context ?? "",
    insightsSummary,
  );


  const startTime = Date.now();

  try {
    let pm: AgentResponse, cto: AgentResponse, ux: AgentResponse, growth: AgentResponse;
    let consensus: ConsensusResponse;

    if (isMock) {
      const mock = await generateMockMultiAgentReview({
        question,
        inputType,
        projectName: (project as any).name ?? "Product",
        targetUsers: (project as any).target_users,
        market: (project as any).market,
      });
      pm = mock.pm;
      cto = mock.cto;
      ux = mock.ux;
      growth = mock.growth;
      consensus = mock.consensus;

      void trackAIUsage({
        userId: user.id,
        projectId,
        model: "mock",
        feature: "multi_agent_review",
        promptTokens: 0,
        completionTokens: 0,
        isMock: true,
        latencyMs: Date.now() - startTime,
      });
    } else {
      if (!hasOpenAIKey()) {
        return NextResponse.json(
          { error: "AI is not configured. Set OPENAI_API_KEY or use USE_REAL_AI=false for mock mode." },
          { status: 503 },
        );
      }

      // Run all 4 agents in parallel
      [pm, cto, ux, growth] = await Promise.all([
        generateAgentResponse("pm", question, inputType, projectContext),
        generateAgentResponse("cto", question, inputType, projectContext),
        generateAgentResponse("ux", question, inputType, projectContext),
        generateAgentResponse("growth", question, inputType, projectContext),
      ]);

      // Generate consensus from agent responses
      consensus = await generateConsensus(question, { pm, cto, ux, growth });

      // Track usage (5 calls: 4 agents + 1 consensus, estimate ~1024 tokens each)
      void trackAIUsage({
        userId: user.id,
        projectId,
        model: "gpt-4o",
        feature: "multi_agent_review",
        promptTokens: Math.ceil(projectContext.length / 4) * 5,
        completionTokens: 1024 * 5,
        isMock: false,
        latencyMs: Date.now() - startTime,
        metadata: { agentCalls: 5, estimated: true },
      });
    }

    // Store review
    const row = {
      project_id: projectId,
      question,
      input_type: inputType,
      pm_response: pm,
      cto_response: cto,
      ux_response: ux,
      growth_response: growth,
      consensus,
      model: isMock ? null : "gpt-4o",
      is_mock: isMock,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("multi_agent_reviews")
      .insert(row)
      .select("*")
      .single();

    if (insertError) {
      console.error("[multi-agent] Insert failed:", insertError.message);
      return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
    }

    return NextResponse.json({ review: inserted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("[multi-agent] Error:", msg);
    void trackAIUsageError({
      userId: user.id,
      projectId,
      feature: "multi_agent_review",
      model: isMock ? "mock" : "gpt-4o",
      error: err,
      isMock,
      latencyMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: `AI error: ${msg}` }, { status: 502 });
  }
}

