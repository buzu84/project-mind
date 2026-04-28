import { prisma } from "@/lib/prisma";
import { generateCompletion } from "@/lib/openai";
import type { DecisionType } from "@prisma/client";

interface CreateDecisionParams {
  type: DecisionType;
  systemPrompt: string;
  userPrompt: string;
  input: Record<string, string | string[] | undefined>;
  projectId: string;
}

export async function createAIDecision({
  type,
  systemPrompt,
  userPrompt,
  input,
  projectId,
}: CreateDecisionParams) {
  const content = await generateCompletion(systemPrompt, userPrompt);

  const decision = await prisma.decision.create({
    data: {
      type,
      input,
      output: { content },
      projectId,
    },
  });

  return { id: decision.id, content };
}

export async function getDecisionsByProject(projectId: string) {
  return prisma.decision.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}


