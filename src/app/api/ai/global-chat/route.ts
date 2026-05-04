import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { trackAIUsage, trackAIUsageError } from "@/lib/ai/usage-tracking";
import { isRealAI } from "@/lib/ai/is-real-ai";
import { checkStandardAILimit, rateLimitResponse } from "@/lib/ai/rate-limiter";

const schema = z.object({
  message: z.string().min(1).max(10000),
});

const SYSTEM_PROMPT = `You are ProductMind, an expert AI product strategy assistant. Help users reason about product ideas, prioritization, strategy, UX, roadmap and risks. If no project is selected, answer generally and suggest creating or selecting a project for richer context.

Always be concise, actionable, and structured. Use bullet points and headers when appropriate. Ground your advice in real-world product management best practices.`;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkStandardAILimit(user);
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { message } = parsed.data;
  const isReal = isRealAI();
  const startTime = Date.now();
  const supabase = createClient();

  // Save user message
  await supabase.from("global_chat_messages").insert({ user_id: user.id, role: "user", content: message });

  // Load conversation history
  const { data: historyRaw } = await supabase
    .from("global_chat_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const history = (historyRaw ?? []).reverse();

  const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(history ?? [])
      .filter((m: any) => m.role !== "system")
      .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  // ── Mock mode ──────────────────────────────────────────────
  if (!isReal) {
    const mockResponse = `Great question! Here's my perspective:\n\n**Key considerations:**\n- Start by defining clear success metrics tied to business outcomes\n- Validate assumptions with real user data before committing resources\n- Consider both short-term wins and long-term strategic value\n\n**Recommended approach:**\n1. Map the problem space thoroughly\n2. Identify the highest-impact opportunity\n3. Build a lightweight prototype to test\n4. Measure results against your success criteria\n5. Iterate based on learnings\n\n*For project-specific advice with full context, use the AI Chat within a project.*\n\n*[Mock response — set USE_REAL_AI=true for real AI]*`;

    await supabase.from("global_chat_messages").insert({ user_id: user.id, role: "assistant", content: mockResponse });

    void trackAIUsage({
      userId: user.id,
      model: "mock",
      feature: "chat",
      promptTokens: 0,
      completionTokens: 0,
      isMock: true,
      latencyMs: Date.now() - startTime,
      metadata: { project_scoped: false },
    });

    const encoder = new TextEncoder();
    const words = mockResponse.split(" ");
    let i = 0;
    const readable = new ReadableStream({
      start(controller) {
        const interval = setInterval(() => {
          if (i >= words.length) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, id: `mock-${Date.now()}`, source: "mock" })}\n\n`));
            controller.close();
            clearInterval(interval);
            return;
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify((i === 0 ? "" : " ") + words[i])}\n\n`));
          i++;
        }, 15);
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }

  // ── Real mode ──────────────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured. Add OPENAI_API_KEY or use mock mode." },
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
            .from("global_chat_messages")
            .insert({ user_id: user.id, role: "assistant", content: fullContent })
            .select("id, created_at")
            .single();

          const estimatedPromptTokens = Math.ceil(SYSTEM_PROMPT.length / 4 + (history ?? []).reduce((s: number, m: any) => s + m.content.length, 0) / 4);
          const estimatedCompletionTokens = Math.ceil(fullContent.length / 4);
          void trackAIUsage({
            userId: user.id,
            model: "gpt-4o",
            feature: "chat",
            promptTokens: estimatedPromptTokens,
            completionTokens: estimatedCompletionTokens,
            isMock: false,
            latencyMs: Date.now() - startTime,
            metadata: { project_scoped: false, estimated: true, streaming: true },
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, id: saved?.id ?? `chat-${Date.now()}`, createdAt: saved?.created_at, source: "real" })}\n\n`));
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Stream failed";
          const friendlyMsg = errorMsg.includes("401") || errorMsg.includes("API key")
            ? "AI is not configured. Add OPENAI_API_KEY or use mock mode."
            : "Could not generate response. Please try again.";
          void trackAIUsageError({
            userId: user.id,
            feature: "chat",
            model: "gpt-4o",
            error: err,
            latencyMs: Date.now() - startTime,
            metadata: { project_scoped: false },
          });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: friendlyMsg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OpenAI request failed";
    const friendly = msg.includes("401") || msg.includes("API key")
      ? "AI is not configured. Add OPENAI_API_KEY or use mock mode."
      : "Could not generate response. Please try again.";
    void trackAIUsageError({
      userId: user.id,
      feature: "chat",
      model: "gpt-4o",
      error: err,
      latencyMs: Date.now() - startTime,
      metadata: { project_scoped: false },
    });
    return NextResponse.json({ error: friendly }, { status: 502 });
  }
}

