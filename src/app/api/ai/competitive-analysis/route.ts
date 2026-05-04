import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCompletionWithUsage } from "@/lib/openai";
import { trackAIUsage, trackAIUsageError } from "@/lib/ai/usage-tracking";
import { generateMockCompetitiveAnalysis } from "@/lib/ai/mock-competitive-analysis";
import { isRealAI } from "@/lib/ai/is-real-ai";
import { checkHeavyAILimit, rateLimitResponse } from "@/lib/ai/rate-limiter";

const schema = z.object({
  projectId: z.string(),
  productName: z.string().min(1),
  industry: z.string().min(1),
  competitors: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkHeavyAILimit(user);
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { projectId, productName, industry, competitors } = parsed.data;
  const supabase = createClient();

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const isReal = isRealAI();
  const isMock = !isReal;
  const startTime = Date.now();

  if (isMock) {
    const content = generateMockCompetitiveAnalysis({ productName, industry, competitors });

    void trackAIUsage({
      userId: user.id,
      projectId,
      model: "mock",
      feature: "competitive_analysis",
      promptTokens: 0,
      completionTokens: 0,
      isMock: true,
      latencyMs: Date.now() - startTime,
    });

    const { data: decision } = await supabase
      .from("decisions")
      .insert({ type: "COMPETITIVE_ANALYSIS", input: parsed.data as object, output: { content }, project_id: projectId })
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

  const systemPrompt = `You are a competitive intelligence analyst. Produce a detailed competitive analysis in Markdown. Include: Market Overview, Competitor Profiles, Feature Comparison Matrix, SWOT Analysis, Strategic Recommendations, and Positioning Map description.`;
  const userPrompt = `Product: ${productName}\nIndustry: ${industry}${competitors ? `\nKnown competitors: ${competitors}` : ""}`;

  try {
    const result = await generateCompletionWithUsage(systemPrompt, userPrompt);

    void trackAIUsage({
      userId: user.id,
      projectId,
      model: result.model,
      feature: "competitive_analysis",
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      isMock: false,
      latencyMs: Date.now() - startTime,
    });

    const { data: decision } = await supabase
      .from("decisions")
      .insert({ type: "COMPETITIVE_ANALYSIS", input: parsed.data as object, output: { content: result.content }, project_id: projectId })
      .select("id")
      .single();

    return NextResponse.json({ id: decision?.id, content: result.content });
  } catch (err) {
    void trackAIUsageError({
      userId: user.id,
      projectId,
      feature: "competitive_analysis",
      model: "gpt-4o",
      error: err,
      latencyMs: Date.now() - startTime,
    });
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("[competitive-analysis] AI error:", msg);
    return NextResponse.json({ error: `AI error: ${msg}` }, { status: 502 });
  }
}
