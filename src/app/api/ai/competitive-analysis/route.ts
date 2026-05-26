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
  productName: z.string().min(1).max(100),
  industry: z.string().min(1).max(200),
  competitors: z.string().max(1000).optional(),
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

  const { data: project } = await supabase.from("projects").select("id, description, target_users, market, business_model, goals").eq("id", projectId).eq("user_id", user.id).single();
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

  const systemPrompt = `You are a competitive intelligence analyst. Produce a detailed competitive analysis in Markdown. Include: Market Overview, Competitor Profiles, Feature Comparison Matrix, SWOT Analysis, Strategic Recommendations, and Positioning Map description.

Important rules:
- Ground your analysis in the product context provided below. Do NOT invent geographic markets, user segments, or competitors that are not mentioned or implied by the product context.
- If the product context specifies a geography, market, or industry, restrict your analysis to that scope.
- If no specific geography is mentioned, do not assume one. Analyze at the level of specificity the context supports.
- Clearly label any assumptions you make.`;

  // Build context-enriched user prompt
  const contextLines: string[] = [
    `Product: ${productName}`,
    `Industry: ${industry}`,
  ];
  if (competitors) contextLines.push(`Known competitors: ${competitors}`);
  if (project.description) contextLines.push(`Product description: ${project.description}`);
  if (project.target_users) contextLines.push(`Target users: ${project.target_users}`);
  if (project.market) contextLines.push(`Market/Industry: ${project.market}`);
  if (project.business_model) contextLines.push(`Business model: ${project.business_model}`);
  if (project.goals) contextLines.push(`Goals: ${project.goals}`);

  const userPrompt = contextLines.join("\n");

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
