import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { generateCompletion } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

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
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, features, criteria } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const systemPrompt = `You are a senior product strategist. Prioritize the given features using a RICE framework (Reach, Impact, Confidence, Effort). Return a JSON array sorted by priority score descending. Each item: { "name": string, "reach": 1-10, "impact": 1-10, "confidence": 1-10, "effort": 1-10, "score": number, "rationale": string }. Wrap the JSON in a markdown code block.`;

  const featureList = features.map((f) => `- ${f.name}${f.description ? `: ${f.description}` : ""}`).join("\n");
  const userPrompt = `Features:\n${featureList}${criteria ? `\n\nAdditional criteria: ${criteria}` : ""}`;

  const output = await generateCompletion(systemPrompt, userPrompt);

  const decision = await prisma.decision.create({
    data: {
      type: "PRIORITIZATION",
      input: parsed.data as object,
      output: { content: output },
      projectId,
    },
  });

  return NextResponse.json({ id: decision.id, content: output });
}

