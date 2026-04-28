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

function buildProjectContext(
  project: {
    name: string;
    description: string | null;
    target_users: string | null;
    market: string | null;
    business_model: string | null;
    goals: string | null;
  },
  context?: Record<string, string | null> | null,
  feedbackDocs?: Array<{ title: string; content: string; source: string | null }> | null,
): string {
  const parts = [`Project: ${project.name}`];
  if (project.description) parts.push(`Description: ${project.description}`);
  if (project.target_users) parts.push(`Target Users: ${project.target_users}`);
  if (project.market) parts.push(`Market: ${project.market}`);
  if (project.business_model) parts.push(`Business Model: ${project.business_model}`);
  if (project.goals) parts.push(`Goals: ${project.goals}`);

  // Rich structured context
  if (context) {
    const labels: Record<string, string> = {
      product_overview: "Product Overview",
      target_personas: "Target Personas",
      current_metrics: "Current Metrics",
      pain_points: "Customer Pain Points",
      competitors: "Competitors",
      strategic_goals: "Strategic Goals",
      constraints: "Constraints",
      open_questions: "Open Questions",
    };
    const filled = Object.entries(labels).filter(([key]) => context[key]);
    if (filled.length > 0) {
      parts.push("\n--- Detailed Project Context ---");
      for (const [key, label] of filled) {
        parts.push(`\n${label}:\n${context[key]}`);
      }
    }
  }

  // Feedback documents (with total size guard)
  if (feedbackDocs && feedbackDocs.length > 0) {
    const MAX_CONTEXT_CHARS = 30000;
    const currentLen = parts.join("\n").length;
    let budget = MAX_CONTEXT_CHARS - currentLen;

    if (budget > 500) {
      parts.push("\n--- Customer Feedback & Research ---");
      budget -= 50; // header overhead

      for (const doc of feedbackDocs) {
        if (budget <= 0) break;
        const source = doc.source ? ` [${doc.source.replace(/_/g, " ")}]` : "";
        const content = doc.content.length > 2000
          ? doc.content.slice(0, 2000) + "... (truncated)"
          : doc.content;
        const entry = `\n${doc.title}${source}:\n${content}`;
        if (entry.length > budget) break;
        parts.push(entry);
        budget -= entry.length;
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

  // Fetch rich context + feedback documents in parallel
  const [contextRes, feedbackRes] = await Promise.all([
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
      .limit(20),
  ]);

  // Save user message
  await supabase.from("messages").insert({ project_id: projectId, role: "user", content: message });

  // Load history
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(50);

  const projectContext = buildProjectContext(project, contextRes.data, feedbackRes.data);
  const systemMessage = `${SYSTEM_PROMPT}\n\nYou are assisting with the following project:\n${projectContext}`;

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
