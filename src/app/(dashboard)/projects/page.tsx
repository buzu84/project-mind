import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateProjectForm } from "./create-project-form";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/sign-in");

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: { _count: { select: { decisions: true, features: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your product projects
          </p>
        </div>
      </div>

      <div className="mt-6">
        <CreateProjectForm />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="hover:border-brand-300 transition cursor-pointer">
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                {project.description && (
                  <CardDescription>{project.description}</CardDescription>
                )}
              </CardHeader>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>{project._count.decisions} decisions</span>
                <span>{project._count.features} features</span>
              </div>
            </Card>
          </Link>
        ))}

        {projects.length === 0 && (
          <p className="col-span-2 text-center text-sm text-gray-400 py-12">
            No projects yet. Create your first one above.
          </p>
        )}
      </div>
    </div>
  );
}

