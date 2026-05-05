import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { retrieveRelevantContext } from "@/lib/rag";
import { trackAIUsage, trackAIUsageError } from "@/lib/ai/usage-tracking";
import { isRealAI } from "@/lib/ai/is-real-ai";
import { checkStandardAILimit, rateLimitResponse } from "@/lib/ai/rate-limiter";

const schema = z.object({
  projectId: z.string().min(1),
  message: z.string().min(1).max(10000),
});

const SYSTEM_PROMPT = `You are ProductMind, an expert AI product strategist. You help founders and product teams make better product decisions using structured analysis, prioritization frameworks and clear reasoning.

Always be concise, actionable, and structured. Use bullet points and headers when appropriate. Ground your advice in real-world product management best practices.

When relevant feedback or research data is provided, reference it in your analysis. Cite specific insights when they support your recommendations.

IMPORTANT — Project isolation:
You are operating inside ONE specific project only. You only have access to the current project's metadata, feedback, research, and context provided below. If the user asks about a different project by name, you must NOT invent or infer details about that project. Instead, say you do not have access to that project in this chat and suggest they switch to that project for project-specific analysis.`;

function buildProjectContext(
  project: {
    name: string;
    description: string | null;
    target_users: string | null;
    market: string | null;
    business_model: string | null;
    goals: string | null;
  },
  structuredContext?: Record<string, string | null> | null,
  ragContext?: string,
): string {
  const parts = [`Project: ${project.name}`];
  if (project.description) parts.push(`Description: ${project.description}`);
  if (project.target_users) parts.push(`Target Users: ${project.target_users}`);
  if (project.market) parts.push(`Market: ${project.market}`);
  if (project.business_model) parts.push(`Business Model: ${project.business_model}`);
  if (project.goals) parts.push(`Goals: ${project.goals}`);

  // Rich structured context
  if (structuredContext) {
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
    const filled = Object.entries(labels).filter(([key]) => structuredContext[key]);
    if (filled.length > 0) {
      parts.push("\n--- Detailed Project Context ---");
      for (const [key, label] of filled) {
        parts.push(`\n${label}:\n${structuredContext[key]}`);
      }
    }
  }

  // RAG-retrieved relevant feedback chunks
  if (ragContext) {
    parts.push(ragContext);
  }

  return parts.join("\n");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkStandardAILimit(user);
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { projectId, message } = parsed.data;
  const supabase = createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name, description, target_users, market, business_model, goals")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Fetch structured context + RAG-retrieve relevant feedback in parallel
  const [contextRes, ragResult] = await Promise.all([
    supabase
      .from("project_context")
      .select("product_overview, target_personas, current_metrics, pain_points, competitors, strategic_goals, constraints, open_questions")
      .eq("project_id", projectId)
      .maybeSingle(),
    retrieveRelevantContext(message, projectId, user.id),
  ]);

  // Save user message
  await supabase.from("messages").insert({ project_id: projectId, role: "user", content: message });

  // Load history
    const { data: historyRaw } = await supabase
      .from("messages")
      .select("role, content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50);

    const history = (historyRaw ?? []).reverse();

  const projectContext = buildProjectContext(project, contextRes.data, ragResult.context);

  if (!ragResult.qualityStats.hasRelevantContext) {
    console.warn("[chat] No relevant RAG context for project", projectId,
      "— retrievedChunks:", ragResult.qualityStats.retrievedChunks,
      "discardedChunks:", ragResult.qualityStats.discardedChunks);
  }

  const noContextWarning = ragResult.qualityStats.hasRelevantContext
    ? ""
    : "\n\nIMPORTANT: You do not have relevant project evidence for this question. Do not fabricate insights based on assumed context. If the user asks about specific feedback, research, or data, let them know you don't have enough relevant evidence to answer confidently.";

  const systemMessage = `${SYSTEM_PROMPT}${noContextWarning}\n\nYou are assisting with the following project:\n${projectContext}`;


  const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemMessage },
    ...(history ?? [])
      .filter((m: any) => m.role !== "system")
      .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const startTime = Date.now();
  const isReal = isRealAI();

  // ── Mock mode ──────────────────────────────────────────────
  if (!isReal) {
    const mockResponse = `Based on my analysis of **${(project as any).name}**, here's my perspective:\n\n${message.length > 50 ? "This is a thoughtful question. " : ""}Let me break this down:\n\n1. **Strategic consideration**: Given your target market${(project as any).target_users ? ` of ${(project as any).target_users}` : ""}, this is an important area to explore.\n\n2. **Key factors**: Consider the competitive landscape, user needs, and technical feasibility when making this decision.\n\n3. **Recommended approach**: Start with user research to validate assumptions, then prioritize based on impact vs. effort.\n\n4. **Next steps**:\n   - Define success metrics\n   - Create a lightweight prototype\n   - Test with a small user cohort\n   - Iterate based on feedback\n\n*This is a mock response for development. Set USE_REAL_AI=true with a valid API key for real AI responses.*`;

    await supabase
      .from("messages")
      .insert({ project_id: projectId, role: "assistant", content: mockResponse });

    void trackAIUsage({
      userId: user.id,
      projectId,
      model: "mock",
      feature: "chat",
      promptTokens: 0,
      completionTokens: 0,
      isMock: true,
      latencyMs: Date.now() - startTime,
      metadata: { project_scoped: true },
    });

    // Return as SSE stream for compatibility with the streaming UI
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        // Send in chunks to simulate streaming
        const words = mockResponse.split(" ");
        let i = 0;
        const interval = setInterval(() => {
          if (i >= words.length) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, id: `mock-${Date.now()}`, createdAt: new Date().toISOString() })}\n\n`));
            controller.close();
            clearInterval(interval);
            return;
          }
          const chunk = (i === 0 ? "" : " ") + words[i];
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          i++;
        }, 20);
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }

  // ── Real mode: check API key ────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured. Set OPENAI_API_KEY or use USE_REAL_AI=false for mock mode." },
      { status: 503 },
    );
  }

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

          // Estimate tokens from content (streaming doesn't return usage)
          const historyTokens = (history ?? []).reduce((s: number, m: any) => s + m.content.length, 0) / 4;
          const estimatedPromptTokens = Math.ceil(systemMessage.length / 4 + historyTokens);
          const estimatedCompletionTokens = Math.ceil(fullContent.length / 4);
          void trackAIUsage({
            userId: user.id,
            projectId,
            model: "gpt-4o",
            feature: "chat",
            promptTokens: estimatedPromptTokens,
            completionTokens: estimatedCompletionTokens,
            isMock: false,
            latencyMs: Date.now() - startTime,
            metadata: { project_scoped: true, estimated: true, streaming: true },
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, id: saved?.id, createdAt: saved?.created_at })}\n\n`),
          );
          controller.close();
        } catch (err) {
          const rawMsg = err instanceof Error ? err.message : "Stream failed";
          const errorMsg = rawMsg.includes("401") || rawMsg.includes("API key")
            ? "AI is not configured. Add OPENAI_API_KEY or use mock mode."
            : "Could not generate response. Please try again.";
          void trackAIUsageError({
            userId: user.id,
            projectId,
            feature: "chat",
            model: "gpt-4o",
            error: err,
            latencyMs: Date.now() - startTime,
            metadata: { project_scoped: true, streaming: true },
          });
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
    const friendlyMessage =
      errorMessage.includes("401") || errorMessage.includes("API key")
        ? "AI is not configured. Set OPENAI_API_KEY or use mock mode."
        : "Could not generate response. Please try again.";
    void trackAIUsageError({
      userId: user.id,
      projectId,
      feature: "chat",
      model: "gpt-4o",
      error: err,
      latencyMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: friendlyMessage }, { status: 502 });
  }
}
