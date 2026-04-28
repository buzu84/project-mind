import { prisma } from "@/lib/prisma";
import type { MessageRole } from "@prisma/client";

// ─── Messages ───────────────────────────────────────────────────────

export async function getMessagesByProject(projectId: string) {
  return prisma.message.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createMessage(data: {
  projectId: string;
  role: MessageRole;
  content: string;
}) {
  return prisma.message.create({ data });
}

export async function deleteMessagesByProject(projectId: string) {
  return prisma.message.deleteMany({ where: { projectId } });
}

