import { prisma } from "@/lib/prisma";

// ─── Feedback Documents ─────────────────────────────────────────────

export async function getDocumentsByProject(projectId: string) {
  return prisma.feedbackDocument.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDocument(data: {
  projectId: string;
  title: string;
  content: string;
  source?: string;
}) {
  return prisma.feedbackDocument.create({ data });
}

export async function deleteDocument(id: string, projectId: string) {
  return prisma.feedbackDocument.deleteMany({
    where: { id, projectId },
  });
}

