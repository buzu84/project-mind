import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { deleteProject } from "../actions";
import { DeleteProjectButton } from "./delete-button";

const tools = [
  { href: "prd", label: "PRD Generator", icon: "📄", description: "Generate a product requirements document" },
  { href: "prioritize", label: "Feature Prioritizer", icon: "🎯", description: "Score and rank your features" },
  { href: "analysis", label: "Competitive Analysis", icon: "🔍", description: "Analyze your competitive landscape" },
];

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/sign-in");

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      decisions: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { decisions: true, features: true } },
    },
  });

  if (!project) notFound();

  const deleteWithId = deleteProject.bind(null, project.id);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-gray-500">{project.description}</p>
          )}
        </div>
        <DeleteProjectButton action={deleteWithId} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.href} href={`/projects/${project.id}/${tool.href}`}>
            <Card className="hover:border-brand-300 transition cursor-pointer h-full">
              <span className="text-2xl">{tool.icon}</span>
              <CardHeader className="mt-2">
                <CardTitle>{tool.label}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {project.decisions.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900">Recent Decisions</h2>
          <div className="mt-4 space-y-3">
            {project.decisions.map((d) => (
              <Card key={d.id} className="py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{d.type.replace("_", " ")}</span>
                  <span className="text-xs text-gray-400">
                    {d.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

