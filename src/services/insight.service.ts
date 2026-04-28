import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ─── Insights ───────────────────────────────────────────────────────

export async function getInsightsByProject(
  projectId: string,
  type?: string,
) {
  return prisma.insight.findMany({
    where: { projectId, ...(type ? { type } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createInsight(data: {
  projectId: string;
  type: string;
  title: string;
  content: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.insight.create({ data });
}

export async function deleteInsight(id: string, projectId: string) {
  return prisma.insight.deleteMany({
    where: { id, projectId },
  });
}

