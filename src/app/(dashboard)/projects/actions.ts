"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const projectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function createProject(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  const parsed = projectSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  const project = await prisma.project.create({
    data: { ...parsed, userId: user.id },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function deleteProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Unauthorized");

  await prisma.project.deleteMany({
    where: { id: projectId, userId: user.id },
  });

  revalidatePath("/projects");
  redirect("/projects");
}

