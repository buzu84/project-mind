import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { generateCompletion } from "@/lib/openai";

const featureSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

const schema = z.object({
  projectId: z.string(),
  features: z.array(featureSchema).min(1).max(30),
  criteria: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { projectId, features, criteria } = parsed.data;
  const supabase = createClient();

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const systemPrompt = `You are a senior product strategist. Prioritize the given features using a RICE framework (Reach, Impact, Confidence, Effort). Return a JSON array sorted by priority score descending. Each item: { "name": string, "reach": 1-10, "impact": 1-10, "confidence": 1-10, "effort": 1-10, "score": number, "rationale": string }. Wrap the JSON in a markdown code block.`;

  const featureList = features.map((f) => `- ${f.name}${f.description ? `: ${f.description}` : ""}`).join("\n");
  const userPrompt = `Features:\n${featureList}${criteria ? `\n\nAdditional criteria: ${criteria}` : ""}`;

  const output = await generateCompletion(systemPrompt, userPrompt);

  const { data: decision } = await supabase
    .from("decisions")
    .insert({ type: "PRIORITIZATION", input: parsed.data as object, output: { content: output }, project_id: projectId })
    .select("id")
    .single();

  return NextResponse.json({ id: decision?.id, content: output });
}
