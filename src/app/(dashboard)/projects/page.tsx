import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isDevMode, isMockDb } from "@/lib/auth";

export const dynamic = "force-dynamic";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, toISOString } from "@/lib/format-date";
import { CreateProjectForm } from "./create-project-form";
import {
  IconChevronRight,
  IconClock,
  IconDocument,
  IconProjects,
} from "@/components/icons";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const mockAuth = isDevMode();
  const mockDb = isMockDb();

  const supabase = createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*, decisions(count), feature_ideas(count)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });


  const list = (projects ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    updated_at: string;
    decisions: { count: number }[];
    feature_ideas: { count: number }[];
  }>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and organize your product projects
          </p>
        </div>
        <Badge variant="info">
          {list.length} project
          {list.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="mt-6">
        <CreateProjectForm />
      </div>

      {list.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <IconProjects className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            No projects yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Create your first project above to start generating PRDs, prioritizing
            features, and analyzing competition.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="group flex items-center justify-between py-4 transition hover:border-brand-200 hover:shadow-md cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-base font-bold text-brand-600">
                    {project.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition">
                      {project.name}
                    </p>
                    {project.description && (
                      <p className="mt-0.5 text-xs text-gray-400 line-clamp-1 max-w-md">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <IconDocument className="h-3 w-3" />
                        {project.decisions?.[0]?.count ?? 0} decisions
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <IconClock className="h-3 w-3" />
                        <time dateTime={toISOString(project.updated_at)}>
                          {formatDate(project.updated_at)}
                        </time>
                      </span>
                    </div>
                  </div>
                </div>
                <IconChevronRight className="h-5 w-5 text-gray-300 transition group-hover:text-brand-500" />
              </Card>
            </Link>
          ))}
        </div>
      )}

      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs text-gray-400 font-mono">
          <span className="font-semibold text-gray-500">Dev:</span>{" "}
          auth={mockAuth ? "mock" : "real"} |{" "}
          db={mockDb ? "mock (in-memory)" : "real Supabase"} |{" "}
          user={user.id} |{" "}
          projects={list.length}
        </div>
      )}
    </div>
  );
}
