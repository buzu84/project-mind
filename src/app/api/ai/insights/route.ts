import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/openai";

const schema = z.object({
  projectId: z.string().min(1),
});

const INSIGHT_TYPES = [
  "risk",
  "opportunity",
  "next_action",
  "roadmap",
  "assumption",
  "pain_point",
  "strategic_gap",
] as const;

interface GeneratedInsight {
  title: string;
  type: (typeof INSIGHT_TYPES)[number];
  explanation: string;
  priority: "critical" | "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  suggested_action: string;
}

const SYSTEM_PROMPT = `You are ProductMind, an expert AI product strategist. Analyze the project context provided and generate strategic insights.

Return a JSON array of insights. Each insight must have exactly these fields:
{
  "title": "short headline (max 80 chars)",
  "type": "risk" | "opportunity" | "next_action" | "roadmap" | "assumption" | "pain_point" | "strategic_gap",
  "explanation": "2-3 sentence explanation with specific reasoning",
  "priority": "critical" | "high" | "medium" | "low",
  "confidence": "high" | "medium" | "low",
  "suggested_action": "concrete, actionable next step"
}

Generate 7-12 diverse insights covering ALL types. Be specific to this project — avoid generic advice.
Prioritize insights that are actionable and grounded in the project data.

Return ONLY the JSON array, no markdown, no explanation.`;

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

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  console.debug(`[insights] Generating insights for project ${projectId}, context: ${projectContext.length} chars`);

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

    const raw = response.choices[0]?.message?.content ?? "[]";
    let insights: GeneratedInsight[];

    console.debug(`[insights] AI response received: ${raw.length} chars`);

    try {
      const parsed = JSON.parse(raw);
      // Handle both { insights: [...] } and direct array
      insights = Array.isArray(parsed) ? parsed : (parsed.insights ?? []);
    } catch {
      console.error("[insights] Failed to parse AI response:", raw.slice(0, 200));
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }

    const validTypes = new Set<string>(INSIGHT_TYPES);

    // Validate and store insights
    const rows = insights
      .filter((i) => i.title && i.type && i.explanation && validTypes.has(i.type))
      .map((i) => ({
        project_id: projectId,
        type: i.type,
        title: i.title.slice(0, 200),
        content: i.explanation,
        metadata: {
          priority: i.priority ?? "medium",
          confidence: i.confidence ?? "medium",
          suggested_action: i.suggested_action ?? "",
        },
      }));

    if (rows.length > 0) {
      // Delete old insights for this project before inserting new ones
      await supabase.from("insights").delete().eq("project_id", projectId);

      const { error: insertError } = await supabase.from("insights").insert(rows);
      if (insertError) {
        console.error("[insights] Insert failed:", insertError.message);
      }
    }

    console.debug(`[insights] Generated ${rows.length} insights for project ${projectId}`);

    return NextResponse.json({
      insights: rows.map((r, i) => ({
        id: `temp-${i}`,
        ...r,
        created_at: new Date().toISOString(),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OpenAI request failed";
    console.error("[insights] AI error:", msg);
    return NextResponse.json({ error: `AI error: ${msg}` }, { status: 502 });
  }
}
