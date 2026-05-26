import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { trackAIUsage, extractTokenUsage, trackAIUsageError } from "@/lib/ai/usage-tracking";
import { generateMockInsights } from "@/lib/ai/mock-insights";
import { isRealAI } from "@/lib/ai/is-real-ai";
import { normalizeInsightsFromAI, type NormalizedInsight } from "@/lib/ai/normalize-insights";
import { checkStandardAILimit, rateLimitResponse } from "@/lib/ai/rate-limiter";
import { verifyProjectOwnership } from "@/lib/auth/verify-project-ownership";

const schema = z.object({
  projectId: z.string().min(1),
});

const SYSTEM_PROMPT = `You are ProductMind, an expert AI product strategist. Analyze the project context provided and generate strategic insights.

Return a JSON object with an "insights" key containing an array. Each insight must have exactly these fields:
{
  "insights": [
    {
      "title": "short headline (max 80 chars)",
      "type": "risk" | "opportunity" | "next_action" | "roadmap" | "assumption" | "pain_point" | "strategic_gap",
      "explanation": "2-3 sentence explanation with specific reasoning",
      "priority": "critical" | "high" | "medium" | "low",
      "confidence": "high" | "medium" | "low",
      "suggested_action": "concrete, actionable next step"
    }
  ]
}

Generate 7-12 diverse insights covering ALL types. Be specific to this project — avoid generic advice.
Prioritize insights that are actionable and grounded in the project data.

Return ONLY the JSON object, no markdown, no explanation outside the JSON.`;

function buildContextForInsights(
  project: Record<string, string | null>,
  context: Record<string, string | null> | null,
  feedbackSummary: string | null,
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
      competitors: "Competitors",
      strategic_goals: "Strategic Goals",
      constraints: "Constraints",
      open_questions: "Open Questions",
    };
    for (const [key, label] of Object.entries(labels)) {
      if (context[key]) parts.push(label + ": " + context[key]);
    }
  }

  if (feedbackSummary) {
    parts.push("\nCustomer Feedback Summary:\n" + feedbackSummary);
  }

  return parts.join("\n");
}

/**
 * Shared function: persist normalized insights to DB and return response payload.
 */
async function saveAndRespond(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  normalized: NormalizedInsight[],
  idPrefix: string,
) {
  const rows = normalized.map((n) => ({
    project_id: projectId,
    type: n.type,
    title: n.title,
    content: n.content,
    metadata: n.metadata,
  }));

  // Insert-before-delete: save new insights first, then remove old ones.
  // This prevents data loss if the insert fails.
  const { data: insertedRows, error: insertError } = await supabase
    .from("insights")
    .insert(rows)
    .select("id, title");

  if (insertError) {
    console.error("[INSIGHTS_INSERT_ERROR]", { message: insertError.message });
  }

  // Delete old insights (keep newly inserted ones)
  const newIds = (insertedRows ?? []).map((r: { id: string }) => r.id);
  if (newIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("insights")
      .delete()
      .eq("project_id", projectId)
      .not("id", "in", `(${newIds.join(",")})`);
    if (deleteError) {
      console.error("[INSIGHTS_DELETE_ERROR]", { message: deleteError.message });
      // Non-fatal: new insights saved, old ones are orphaned but harmless
    }
  }

  // Use inserted rows for verification
  const verifyRows = insertedRows;

  // Build response — use DB IDs if available, otherwise synthetic
  const responseInsights = verifyRows && verifyRows.length > 0
    ? verifyRows.map((v: any, i: number) => {
        const n = normalized[i] ?? normalized[0];
        return {
          id: v.id,
          project_id: projectId,
          type: n.type,
          title: v.title,
          content: n.content,
          metadata: n.metadata,
          created_at: v.created_at ?? new Date().toISOString(),
        };
      })
    : rows.map((r, i) => ({
        id: `${idPrefix}-${i}`,
        ...r,
        created_at: new Date().toISOString(),
      }));

  return responseInsights;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkStandardAILimit(user);
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { projectId } = parsed.data;
  const supabase = createClient();

  // Fetch project + context + recent feedback in parallel
  const [projectRes, contextRes, feedbackRes] = await Promise.all([
    supabase
      .from("projects")
      .select("name, description, target_users, market, business_model, goals")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("project_context")
      .select("product_overview, target_personas, current_metrics, pain_points, competitors, strategic_goals, constraints, open_questions")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("feedback_documents")
      .select("title, content, source")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!projectRes.data) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Build a brief feedback summary (truncated for prompt efficiency)
  const feedbackDocs = (feedbackRes.data ?? []) as Array<{ title: string; content: string; source: string | null }>;
  const feedbackSummary = feedbackDocs.length > 0
    ? feedbackDocs
        .map((d) => {
          const src = d.source ? ` [${d.source.replace(/_/g, " ")}]` : "";
          const content = d.content.length > 500 ? d.content.slice(0, 500) + "..." : d.content;
          return d.title + src + ": " + content;
        })
        .join("\n\n")
    : null;

  const projectContext = buildContextForInsights(
    projectRes.data as Record<string, string | null>,
    contextRes.data as Record<string, string | null> | null,
    feedbackSummary,
  );

  const isReal = isRealAI();
  const isMock = !isReal;
  const startTime = Date.now();

  // ── Mock mode ──────────────────────────────────────────────────────
  if (isMock) {
    const projectData = projectRes.data as Record<string, string | null>;
    const mockInsights = generateMockInsights({
      projectName: projectData.name ?? "Product",
      targetUsers: projectData.target_users,
      market: projectData.market,
    });

    // Convert mock output to raw JSON string, then normalize through same pipeline
    const mockRaw = JSON.stringify({ insights: mockInsights });
    const { insights: normalized } = normalizeInsightsFromAI(mockRaw);

    const responseInsights = await saveAndRespond(supabase, projectId, normalized, "mock");

    void trackAIUsage({
      userId: user.id,
      projectId,
      model: "mock",
      feature: "insights",
      promptTokens: 0,
      completionTokens: 0,
      isMock: true,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json({ insights: responseInsights });
  }

  // ── Real mode: check API key ──────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured. Set OPENAI_API_KEY or use USE_REAL_AI=false for mock mode." },
      { status: 503 },
    );
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: "Analyze this project and generate strategic insights:\n\n" + projectContext },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";

    // Track usage
    const tokens = extractTokenUsage(response as any);
    void trackAIUsage({
      userId: user.id,
      projectId,
      model: "gpt-4o",
      feature: "insights",
      promptTokens: tokens.promptTokens,
      completionTokens: tokens.completionTokens,
      isMock: false,
      latencyMs: Date.now() - startTime,
    });

    // Normalize through shared pipeline
    const { insights: normalized, error: parseError } = normalizeInsightsFromAI(raw);

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: parseError ?? "AI returned no usable insights. Please try again." },
        { status: 502 },
      );
    }

    const responseInsights = await saveAndRespond(supabase, projectId, normalized, "real");

    return NextResponse.json({ insights: responseInsights });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OpenAI request failed";
    console.error("[insights] AI error:", msg);
    void trackAIUsageError({
      userId: user.id,
      projectId,
      feature: "insights",
      model: "gpt-4o",
      error: err,
      latencyMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: `AI error: ${msg}` }, { status: 502 });
  }
}

// ── DELETE handler ──────────────────────────────────────────────────

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const isOwner = await verifyProjectOwnership(projectId, user.id);
  if (!isOwner) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const supabase = createClient();
  const { error } = await supabase.from("insights").delete().eq("project_id", projectId);

  if (error) {
    console.error("[insights] Delete failed:", error.message);
    return NextResponse.json({ error: "Failed to delete insights" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
