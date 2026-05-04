import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCompletionWithUsage } from "@/lib/openai";
import { trackAIUsage, trackAIUsageError } from "@/lib/ai/usage-tracking";
import { generateMockPrd } from "@/lib/ai/mock-prd";
import { isRealAI } from "@/lib/ai/is-real-ai";
import { checkHeavyAILimit, rateLimitResponse } from "@/lib/ai/rate-limiter";

const schema = z.object({
  projectId: z.string(),
  productName: z.string().min(1),
  productDescription: z.string().min(10),
  targetAudience: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkHeavyAILimit(user);
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const msg = Object.entries(fieldErrors)
      .filter(([, v]) => v && v.length > 0)
      .map(([k, v]) => `${k}: ${v![0]}`)
      .join(", ") || "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { projectId, productName, productDescription, targetAudience } = parsed.data;
  const supabase = createClient();

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const isReal = isRealAI();
  const isMock = !isReal;
  const startTime = Date.now();

  if (isMock) {
    const content = generateMockPrd({ productName, productDescription, targetAudience });

    void trackAIUsage({
      userId: user.id,
      projectId,
      model: "mock",
      feature: "prd",
      promptTokens: 0,
      completionTokens: 0,
      isMock: true,
      latencyMs: Date.now() - startTime,
    });

    const { data: decision } = await supabase
      .from("decisions")
      .insert({ type: "PRD", input: parsed.data as object, output: { content }, project_id: projectId })
      .select("id")
      .single();

    return NextResponse.json({ id: decision?.id, content });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured. Set OPENAI_API_KEY or use USE_REAL_AI=false for mock mode." },
      { status: 503 },
    );
  }

  const systemPrompt = `You are a senior product manager. Generate a comprehensive Product Requirements Document (PRD) in Markdown format. Include: Executive Summary, Problem Statement, Goals & Success Metrics, User Stories, Functional Requirements, Non-Functional Requirements, Timeline, and Risks.`;
  const userPrompt = `Product: ${productName}\nDescription: ${productDescription}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ""}`;


  try {
    const result = await generateCompletionWithUsage(systemPrompt, userPrompt);

    void trackAIUsage({
      userId: user.id,
      projectId,
      model: result.model,
      feature: "prd",
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      isMock: false,
      latencyMs: Date.now() - startTime,
    });

    const { data: decision } = await supabase
      .from("decisions")
      .insert({ type: "PRD", input: parsed.data as object, output: { content: result.content }, project_id: projectId })
      .select("id")
      .single();

    return NextResponse.json({ id: decision?.id, content: result.content });
  } catch (err) {
    void trackAIUsageError({
      userId: user.id,
      projectId,
      feature: "prd",
      model: "gpt-4o",
      error: err,
      latencyMs: Date.now() - startTime,
    });
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("[prd] AI error:", msg);
    return NextResponse.json({ error: `AI error: ${msg}` }, { status: 502 });
  }
}
