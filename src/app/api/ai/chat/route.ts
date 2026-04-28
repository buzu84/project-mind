import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  projectId: z.string().min(1),
  message: z.string().min(1).max(10000),
});

const SYSTEM_PROMPT = `You are ProductMind, an expert AI product strategist. You help founders and product teams make better product decisions using structured analysis, prioritization frameworks and clear reasoning.

Always be concise, actionable, and structured. Use bullet points and headers when appropriate. Ground your advice in real-world product management best practices.`;

function buildProjectContext(project: {
  name: string;
  description: string | null;
  targetUsers: string | null;
  market: string | null;
  businessModel: string | null;
  goals: string | null;
}): string {
  const parts = [`Project: ${project.name}`];
  if (project.description) parts.push(`Description: ${project.description}`);
  if (project.targetUsers) parts.push(`Target Users: ${project.targetUsers}`);
  if (project.market) parts.push(`Market: ${project.market}`);
  if (project.businessModel) parts.push(`Business Model: ${project.businessModel}`);
  if (project.goals) parts.push(`Goals: ${project.goals}`);
  return parts.join("\n");
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { projectId, message } = parsed.data;

  // Verify ownership and get project context
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Save user message
  await prisma.message.create({
    data: { projectId, role: "user", content: message },
  });

  // Load conversation history (last 50 messages for context window)
  const history = await prisma.message.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  // Build messages for OpenAI
  const projectContext = buildProjectContext(project);
  const systemMessage = `${SYSTEM_PROMPT}\n\nYou are assisting with the following project:\n${projectContext}`;

  const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemMessage },
    ...history
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 4096,
    });

    const assistantContent = completion.choices[0]?.message?.content ?? "I couldn't generate a response. Please try again.";

    // Save assistant response
    const assistantMessage = await prisma.message.create({
      data: { projectId, role: "assistant", content: assistantContent },
    });

    return NextResponse.json({
      id: assistantMessage.id,
      role: "assistant",
      content: assistantContent,
      createdAt: assistantMessage.createdAt,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "OpenAI request failed";

    // If OpenAI fails, still keep the user message but return error
    return NextResponse.json(
      { error: `AI error: ${errorMessage}` },
      { status: 502 },
    );
  }
}

