import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { generateCompletion } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  projectId: z.string(),
  productName: z.string().min(1),
  productDescription: z.string().min(10),
  targetAudience: z.string().optional(),
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

  const { projectId, productName, productDescription, targetAudience } = parsed.data;

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const systemPrompt = `You are a senior product manager. Generate a comprehensive Product Requirements Document (PRD) in Markdown format. Include: Executive Summary, Problem Statement, Goals & Success Metrics, User Stories, Functional Requirements, Non-Functional Requirements, Timeline, and Risks.`;

  const userPrompt = `Product: ${productName}\nDescription: ${productDescription}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ""}`;

  const output = await generateCompletion(systemPrompt, userPrompt);

  const decision = await prisma.decision.create({
    data: {
      type: "PRD",
      input: parsed.data as object,
      output: { content: output },
      projectId,
    },
  });

  return NextResponse.json({ id: decision.id, content: output });
}

