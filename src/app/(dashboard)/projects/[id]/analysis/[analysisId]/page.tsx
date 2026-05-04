import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { IconArrowLeft } from "@/components/icons";
import { DocumentRenderer } from "@/components/document-renderer";

interface Decision {
  id: string;
  type: string;
  input: {
    productName?: string;
    industry?: string;
    competitors?: string;
  } | null;
  output: { content: string } | null;
  project_id: string;
  created_at: string;
}

export default async function AnalysisResultPage({
  params,
}: {
  params: { id: string; analysisId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const supabase = createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  const { data: decision } = await supabase
    .from("decisions")
    .select("id, type, input, output, project_id, created_at")
    .eq("id", params.analysisId)
    .eq("project_id", params.id)
    .eq("type", "COMPETITIVE_ANALYSIS")
    .single();

  if (!decision) notFound();

  const analysis = decision as unknown as Decision;
  const content = analysis.output?.content ?? "";
  const productName = analysis.input?.productName ?? "Competitive Analysis";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to {project.name}
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🔍 {productName}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm text-gray-500">
              Generated on{" "}
              {new Date(analysis.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <Badge variant="info">Competitive Analysis</Badge>
            {analysis.input?.industry && (
              <Badge variant="default">{analysis.input.industry}</Badge>
            )}
          </div>
        </div>
        <Link
          href={`/projects/${project.id}/analysis`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
        >
          + New Analysis
        </Link>
      </div>

      <DocumentRenderer content={content} />
    </div>
  );
}
