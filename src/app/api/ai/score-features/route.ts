import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { trackAIUsage, extractTokenUsage, trackAIUsageError } from "@/lib/ai/usage-tracking";
import { generateMockFeatureScores } from "@/lib/ai/mock-feature-scoring";
import { isRealAI } from "@/lib/ai/is-real-ai";
import { checkStandardAILimit, rateLimitResponse } from "@/lib/ai/rate-limiter";

const schema = z.object({
  projectId: z.string().min(1),
});

interface ScoredFeature {
  name: string;
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  rice_score: number;
  ice_score: number;
  ai_commentary: string;
}

const SYSTEM_PROMPT = `You are ProductMind, an expert product strategist. Score the given feature ideas using RICE and ICE frameworks.

For each feature, provide:
- reach: 1-10 (how many users will this affect?)
- impact: 1-10 (how much will it move the needle per user?)
- confidence: 1-10 (how sure are you about reach and impact estimates?)
- effort: 1-10 (how much work is required? 1=trivial, 10=massive)
- rice_score: (reach × impact × confidence) / effort
- ice_score: (impact × confidence × ease) where ease = 10 / effort
- ai_commentary: Explain your assumptions for EACH dimension:
  1. Reach: why this score?
  2. Impact: why this score?
  3. Confidence: what makes you more or less sure?
  4. Effort: what technical/design work is involved?
  Then summarize why the overall RICE/ICE ranking makes sense.

Return a JSON object: { "features": [...] }
Each item must have: name, reach, impact, confidence, effort, rice_score, ice_score, ai_commentary

Be specific to this project. Consider the target users, market, and goals when scoring.`;

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

  // Fetch project + features + context in parallel
  const [projectRes, featuresRes, contextRes] = await Promise.all([
    supabase
      .from("projects")
      .select("name, description, target_users, market, business_model, goals")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("feature_ideas")
      .select("id, name, description")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_context")
      .select("product_overview, target_personas, current_metrics, pain_points, strategic_goals")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (!projectRes.data) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const featuresList = (featuresRes.data ?? []) as Array<{ id: string; name: string; description: string | null }>;
  if (featuresList.length === 0) return NextResponse.json({ error: "No features to score" }, { status: 400 });

  // Build context
  const project = projectRes.data;
  const ctx = contextRes.data as Record<string, string | null> | null;
  const contextParts: string[] = [];
  if (project.name) contextParts.push("Project: " + project.name);
  if (project.description) contextParts.push("Description: " + project.description);
  if (project.target_users) contextParts.push("Target Users: " + project.target_users);
  if (project.market) contextParts.push("Market: " + project.market);
  if (project.goals) contextParts.push("Goals: " + project.goals);
  if (ctx) {
    for (const [k, v] of Object.entries(ctx)) {
      if (v) contextParts.push(k.replace(/_/g, " ") + ": " + v);
    }
  }

  const featureList = featuresList
    .map((f, i) => `${i + 1}. ${f.name}${f.description ? " — " + f.description : ""}`)
    .join("\n");

  const userPrompt = `Project Context:\n${contextParts.join("\n")}\n\nFeature Ideas to Score:\n${featureList}`;


  const isReal = isRealAI();
  const isMock = !isReal;
  const startTime = Date.now();

  // ── Mock mode ──────────────────────────────────────────────
  if (isMock) {
    const mockScores = generateMockFeatureScores(
      featuresList.map((f) => ({ name: f.name, description: f.description })),
      (project as any).name,
    );

    for (const feature of featuresList) {
      const match = mockScores.find(
        (s) => s.name.toLowerCase().trim() === feature.name.toLowerCase().trim(),
      );
      if (!match) continue;

      await supabase
        .from("feature_ideas")
        .update({
          reach: match.reach,
          impact: match.impact,
          confidence: match.confidence,
          effort: match.effort,
          rice_score: match.rice_score,
          ice_score: match.ice_score,
          ai_commentary: match.ai_commentary,
        })
        .eq("id", feature.id);
    }

    void trackAIUsage({
      userId: user.id,
      projectId,
      model: "mock",
      feature: "feature_prioritization",
      promptTokens: 0,
      completionTokens: 0,
      isMock: true,
      latencyMs: Date.now() - startTime,
    });

    const { data: updated } = await supabase
      .from("feature_ideas")
      .select("id, name, description, reach, impact, confidence, effort, rice_score, ice_score, ai_commentary, status, created_at, updated_at")
      .eq("project_id", projectId)
      .order("rice_score", { ascending: false });

    return NextResponse.json({ features: updated ?? [] });
  }

  // ── Real mode: check API key ────────────────────────────────
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
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
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
      feature: "feature_prioritization",
      promptTokens: tokens.promptTokens,
      completionTokens: tokens.completionTokens,
      isMock: false,
      latencyMs: Date.now() - startTime,
    });

    let scored: ScoredFeature[];
    try {
      const parsed = JSON.parse(raw);
      scored = Array.isArray(parsed) ? parsed : (parsed.features ?? []);
    } catch {
      console.error("[score-features] Failed to parse AI response:", raw.slice(0, 200));
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }

    // Match AI results to DB features by name and update
    for (const feature of featuresList) {
      const match = scored.find(
        (s) => s.name.toLowerCase().trim() === feature.name.toLowerCase().trim()
      );
      if (!match) continue;

      const reach = Math.min(10, Math.max(0, Math.round(match.reach)));
      const impact = Math.min(10, Math.max(0, Math.round(match.impact)));
      const confidence = Math.min(10, Math.max(0, Math.round(match.confidence)));
      const effort = Math.min(10, Math.max(1, Math.round(match.effort)));
      const rice_score = (reach * impact * confidence) / effort;
      const ice_score = (impact * confidence * 10) / effort;

      await supabase
        .from("feature_ideas")
        .update({
          reach,
          impact,
          confidence,
          effort,
          rice_score: Math.round(rice_score * 100) / 100,
          ice_score: Math.round(ice_score * 100) / 100,
          ai_commentary: match.ai_commentary?.slice(0, 1000) ?? null,
        })
        .eq("id", feature.id);
    }

    // Re-fetch updated features
    const { data: updated } = await supabase
      .from("feature_ideas")
      .select("id, name, description, reach, impact, confidence, effort, rice_score, ice_score, ai_commentary, status, created_at")
      .eq("project_id", projectId)
      .order("rice_score", { ascending: false });


    return NextResponse.json({ features: updated ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OpenAI request failed";
    console.error("[score-features] AI error:", msg);
    void trackAIUsageError({
      userId: user.id,
      projectId,
      feature: "feature_prioritization",
      model: "gpt-4o",
      error: err,
      latencyMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: `AI error: ${msg}` }, { status: 502 });
  }
}
