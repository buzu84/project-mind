import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { retrieveRelevantContext } from "@/lib/rag";
import { generateMockRoadmap } from "@/lib/ai/mock-roadmap";

// ── AI mode helpers ─────────────────────────────────────────────────

function useRealAI(): boolean {
  if (process.env.USE_REAL_AI === "false") return false;
  if (process.env.USE_REAL_AI === "true") return true;
  // Default: use real AI only if key exists
  return !!process.env.OPENAI_API_KEY;
}

function hasOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// ── Input schema ────────────────────────────────────────────────────

const schema = z.object({
  projectId: z.string().min(1),
});

// ── Types ───────────────────────────────────────────────────────────

interface RoadmapItem {
  title: string;
  description: string;
  priority?: "critical" | "high" | "medium" | "low";
  confidence?: "high" | "medium" | "low";
}

interface GeneratedRoadmap {
  title: string;
  now: RoadmapItem[];
  next: RoadmapItem[];
  later: RoadmapItem[];
  plan_30_days: RoadmapItem[];
  plan_60_days: RoadmapItem[];
  plan_90_days: RoadmapItem[];
  risks: RoadmapItem[];
  dependencies: RoadmapItem[];
  success_metrics: RoadmapItem[];
}

// ── System prompt ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are ProductMind, an expert product strategist and roadmap planner.

Based on the project context, customer feedback, and strategic insights provided, generate a structured product roadmap.

Return a JSON object with this exact shape:
{
  "title": "A concise roadmap title for this project",
  "now": [{ "title": "...", "description": "...", "priority": "critical|high|medium|low", "confidence": "high|medium|low" }],
  "next": [...],
  "later": [...],
  "plan_30_days": [...],
  "plan_60_days": [...],
  "plan_90_days": [...],
  "risks": [{ "title": "...", "description": "...", "priority": "critical|high|medium|low" }],
  "dependencies": [{ "title": "...", "description": "..." }],
  "success_metrics": [{ "title": "...", "description": "..." }]
}

Guidelines:
- "now" = immediate priorities (this sprint / this week). 3-5 items.
- "next" = upcoming work (next 2-4 weeks). 3-5 items.
- "later" = future considerations (1-3 months out). 3-5 items.
- "plan_30_days" = concrete milestones for the first 30 days. 2-4 items.
- "plan_60_days" = milestones for days 31-60. 2-4 items.
- "plan_90_days" = milestones for days 61-90. 2-4 items.
- "risks" = potential blockers or threats. 2-4 items.
- "dependencies" = things that must be in place. 2-4 items.
- "success_metrics" = measurable KPIs to track. 3-5 items.

Be specific to this project. Ground recommendations in the provided context and feedback data.
Each item must have at minimum a "title" and "description".
Do NOT return generic advice. Be actionable and concrete.`;

// ── Context builder ─────────────────────────────────────────────────

function buildPromptContext(
  project: Record<string, string | null>,
  context: Record<string, string | null> | null,
  feedbackSummary: string | null,
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

  if (ragContext) {
    parts.push(ragContext);
  }

  if (insightsSummary) {
    parts.push("\nExisting AI Insights:\n" + insightsSummary);
  }

  return parts.join("\n");
}

// ── POST handler ────────────────────────────────────────────────────

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { projectId } = parsed.data;
  const supabase = createClient();

  // Fetch project + context + feedback + insights in parallel
  const [projectRes, contextRes, feedbackRes, insightsRes, ragResult] = await Promise.all([
    supabase
      .from("projects")
      .select("name, description, target_users, market, business_model, goals")
      .eq("id", projectId)
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
    supabase
      .from("insights")
      .select("type, title, content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(15),
    retrieveRelevantContext("product roadmap priorities risks milestones", projectId).catch(() => ({
      context: "",
      results: [],
    })),
  ]);

  if (!projectRes.data) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Build feedback summary (truncated)
  const feedbackDocs = (feedbackRes.data ?? []) as Array<{ title: string; content: string; source: string | null }>;
  const feedbackSummary =
    feedbackDocs.length > 0
      ? feedbackDocs
          .map((d) => {
            const src = d.source ? ` [${d.source.replace(/_/g, " ")}]` : "";
            const content = d.content.length > 400 ? d.content.slice(0, 400) + "..." : d.content;
            return d.title + src + ": " + content;
          })
          .join("\n\n")
      : null;

  // Build insights summary
  const insightsList = (insightsRes.data ?? []) as Array<{ type: string; title: string; content: string }>;
  const insightsSummary =
    insightsList.length > 0
      ? insightsList.map((i) => `[${i.type}] ${i.title}: ${i.content}`).join("\n")
      : null;

  const promptContext = buildPromptContext(
    projectRes.data as Record<string, string | null>,
    contextRes.data as Record<string, string | null> | null,
    feedbackSummary,
    ragResult.context,
    insightsSummary,
  );

  const isRealAI = useRealAI();
  const isMock = !isRealAI;

  console.debug(
    `[roadmap] Generating roadmap for project ${projectId} | ` +
      `mode: ${isMock ? "MOCK" : "REAL AI"} | ` +
      `context: ${promptContext.length} chars | ` +
      `RAG chunks: ${ragResult.results.length} | ` +
      `feedback docs: ${feedbackDocs.length} | ` +
      `insights: ${insightsList.length}`,
  );

  try {
    let roadmap: GeneratedRoadmap;

    if (isMock) {
      // ── Mock mode: generate without OpenAI ──────────────────────
      const projectData = projectRes.data as Record<string, string | null>;
      roadmap = await generateMockRoadmap({
        projectName: projectData.name ?? "Product",
        description: projectData.description,
        targetUsers: projectData.target_users,
        market: projectData.market,
        businessModel: projectData.business_model,
        goals: projectData.goals,
      });
      console.debug("[roadmap] Mock roadmap generated");
    } else {
      // ── Real AI mode ────────────────────────────────────────────
      if (!hasOpenAIKey()) {
        return NextResponse.json(
          { error: "AI is not configured. Set OPENAI_API_KEY or use USE_REAL_AI=false for mock mode." },
          { status: 503 },
        );
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: "Generate a product roadmap based on this project:\n\n" + promptContext },
        ],
        temperature: 0.6,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      console.debug(`[roadmap] AI response received: ${raw.length} chars`);

      try {
        roadmap = JSON.parse(raw);
      } catch {
        console.error("[roadmap] Failed to parse AI response:", raw.slice(0, 200));
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
      }

      if (!roadmap.now && !roadmap.next && !roadmap.later) {
        console.error("[roadmap] AI returned empty roadmap structure");
        return NextResponse.json({ error: "AI returned an incomplete roadmap" }, { status: 502 });
      }
    }

    const ensureArray = (val: unknown): RoadmapItem[] =>
      Array.isArray(val)
        ? val.filter((item) => item && typeof item.title === "string")
        : [];

    // Build row for DB
    const row = {
      project_id: projectId,
      title: roadmap.title || `${(projectRes.data as any).name} Roadmap`,
      now_items: ensureArray(roadmap.now),
      next_items: ensureArray(roadmap.next),
      later_items: ensureArray(roadmap.later),
      plan_30_days: ensureArray(roadmap.plan_30_days),
      plan_60_days: ensureArray(roadmap.plan_60_days),
      plan_90_days: ensureArray(roadmap.plan_90_days),
      risks: ensureArray(roadmap.risks),
      dependencies: ensureArray(roadmap.dependencies),
      success_metrics: ensureArray(roadmap.success_metrics),
      is_mock: isMock,
    };

    // Delete existing roadmap for this project, then insert new one
    await supabase.from("roadmaps").delete().eq("project_id", projectId);

    const { data: inserted, error: insertError } = await supabase
      .from("roadmaps")
      .insert(row)
      .select("*")
      .single();

    if (insertError) {
      console.error("[roadmap] Insert failed:", insertError.message);
      return NextResponse.json({ error: "Failed to save roadmap" }, { status: 500 });
    }

    console.debug(`[roadmap] Roadmap saved for project ${projectId}`);

    return NextResponse.json({ roadmap: inserted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OpenAI request failed";
    console.error("[roadmap] AI error:", msg);
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

  const supabase = createClient();
  const { error } = await supabase.from("roadmaps").delete().eq("project_id", projectId);

  if (error) {
    console.error("[roadmap] Delete failed:", error.message);
    return NextResponse.json({ error: "Failed to delete roadmap" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

