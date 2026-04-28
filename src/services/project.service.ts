import { prisma } from "@/lib/prisma";

export async function getProjectsByUserId(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    include: { _count: { select: { decisions: true, features: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProjectById(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      decisions: { orderBy: { createdAt: "desc" }, take: 10 },
      features: { orderBy: { priority: "desc" } },
      _count: { select: { decisions: true, features: true } },
    },
  });
}

export async function createProject(
  data: { name: string; description?: string },
  userId: string,
) {
  return prisma.project.create({
    data: { ...data, userId },
  });
}

export async function deleteProject(projectId: string, userId: string) {
  return prisma.project.deleteMany({
    where: { id: projectId, userId },
  });
}

