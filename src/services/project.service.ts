import { prisma } from "@/lib/prisma";

export async function getProjectsByUserId(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    include: {
      _count: {
        select: { decisions: true, features: true, messages: true, insights: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProjectById(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      decisions: { orderBy: { createdAt: "desc" }, take: 10 },
      features: { orderBy: { priority: "desc" } },
      insights: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: {
        select: { decisions: true, features: true, messages: true, documents: true, insights: true },
      },
    },
  });
}

export async function createProject(
  data: {
    name: string;
    description?: string;
    targetUsers?: string;
    market?: string;
    businessModel?: string;
    goals?: string;
  },
  userId: string,
) {
  return prisma.project.create({
    data: { ...data, userId },
  });
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    targetUsers?: string;
    market?: string;
    businessModel?: string;
    goals?: string;
  },
) {
  return prisma.project.updateMany({
    where: { id: projectId, userId },
    data,
  });
}

export async function deleteProject(projectId: string, userId: string) {
  return prisma.project.deleteMany({
    where: { id: projectId, userId },
  });
}
