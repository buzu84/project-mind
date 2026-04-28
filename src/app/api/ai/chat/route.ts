import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/openai";

const schema = z.object({
  projectId: z.string().min(1),
  message: z.string().min(1).max(10000),
});

const SYSTEM_PROMPT = `You are ProductMind, an expert AI product strategist. You help founders and product teams make better product decisions using structured analysis, prioritization frameworks and clear reasoning.

Always be concise, actionable, and structured. Use bullet points and headers when appropriate. Ground your advice in real-world product management best practices.`;

function buildProjectContext(project: {
  name: string;
  description: string | null;
  target_users: string | null;
  market: string | null;
  business_model: string | null;
  goals: string | null;
}, context?: {
  product_overview: string | null;
  target_personas: string | null;
  current_metrics: string | null;
  pain_points: string | null;
  competitors: string | null;
  strategic_goals: string | null;
  constraints: string | null;
  open_questions: string | null;
} | null): string {
  const parts = [`Project: ${project.name}`];
  if (project.description) parts.push(`Description: ${project.description}`);
  if (project.target_users) parts.push(`Target Users: ${project.target_users}`);
  if (project.market) parts.push(`Market: ${project.market}`);
  if (project.business_model) parts.push(`Business Model: ${project.business_model}`);
  if (project.goals) parts.push(`Goals: ${project.goals}`);

  if (context) {
    const sections: [string, string | null][] = [
      ["Product Overview", context.product_overview],
      ["Target Personas", context.target_personas],
      ["Current Metrics", context.current_metrics],
      ["Customer Pain Points", context.pain_points],
      ["Competitors", context.competitors],
      ["Strategic Goals", context.strategic_goals],
      ["Constraints", context.constraints],
      ["Open Questions", context.open_questions],
    ];
    const filled = sections.filter(([, v]) => v);
    if (filled.length > 0) {
      parts.push("\n--- Detailed Project Context ---");
      for (const [label, value] of filled) {
        parts.push(`\n${label}:\n${value}`);
      }
    }
  }

  return parts.join("\n");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { projectId, message } = parsed.data;
  const supabase = createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name, description, target_users, market, business_model, goals")
    .eq("id", projectId)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  console.debug(`[ai/chat] Loaded project context for "${project.name}" (${projectId})`);

  // Fetch rich context
  const { data: context } = await supabase
    .from("project_context")
    .select("product_overview, target_personas, current_metrics, pain_points, competitors, strategic_goals, constraints, open_questions")
    .eq("project_id", projectId)
    .maybeSingle();

  const contextSections = context
    ? Object.values(context).filter(Boolean).length
    : 0;
  console.debug(`[ai/chat] Rich context: ${contextSections} sections filled`);

  // Save user message
  await supabase.from("messages").insert({ project_id: projectId, role: "user", content: message });

  // Load history
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(50);

  const projectContext = buildProjectContext(project, context);
  const systemMessage = `${SYSTEM_PROMPT}\n\nYou are assisting with the following project:\n${projectContext}`;

  console.debug(`[ai/chat] Building AI prompt with context (${systemMessage.length} chars), ${(history ?? []).length} history messages`);

  const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemMessage },
    ...(history ?? [])
      .filter((m: any) => m.role !== "system")
      .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    });

    const encoder = new TextEncoder();
    let fullContent = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(delta)}\n\n`));
            }
          }

          const { data: saved } = await supabase
            .from("messages")
            .insert({ project_id: projectId, role: "assistant", content: fullContent })
            .select("id, created_at")
            .single();

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, id: saved?.id, createdAt: saved?.created_at })}\n\n`),
          );
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Stream failed";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "OpenAI request failed";
    return NextResponse.json({ error: `AI error: ${errorMessage}` }, { status: 502 });
  }
}
