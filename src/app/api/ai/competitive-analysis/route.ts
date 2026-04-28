import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { generateCompletion } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  projectId: z.string(),
  productName: z.string().min(1),
  industry: z.string().min(1),
  competitors: z.string().optional(),
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

  const { projectId, productName, industry, competitors } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const systemPrompt = `You are a competitive intelligence analyst. Produce a detailed competitive analysis in Markdown. Include: Market Overview, Competitor Profiles, Feature Comparison Matrix, SWOT Analysis, Strategic Recommendations, and Positioning Map description.`;

  const userPrompt = `Product: ${productName}\nIndustry: ${industry}${competitors ? `\nKnown competitors: ${competitors}` : ""}`;

  const output = await generateCompletion(systemPrompt, userPrompt);

  const decision = await prisma.decision.create({
    data: {
      type: "COMPETITIVE_ANALYSIS",
      input: parsed.data as object,
      output: { content: output },
      projectId,
    },
  });

  return NextResponse.json({ id: decision.id, content: output });
}

