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
    productDescription?: string;
    targetAudience?: string;
  } | null;
  output: { content: string } | null;
  project_id: string;
  created_at: string;
}

export default async function PrdResultPage({
  params,
}: {
  params: { id: string; prdId: string };
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
    .eq("id", params.prdId)
    .eq("project_id", params.id)
    .eq("type", "PRD")
    .single();

  if (!decision) notFound();

  const prd = decision as unknown as Decision;
  const content = prd.output?.content ?? "";
  const productName = prd.input?.productName ?? "PRD";

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
            📄 {productName}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm text-gray-500">
              Generated on{" "}
              {new Date(prd.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <Badge variant="info">PRD</Badge>
            {prd.input?.targetAudience && (
              <Badge variant="default">{prd.input.targetAudience}</Badge>
            )}
          </div>
        </div>
        <Link
          href={`/projects/${project.id}/prd`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
        >
          + Generate another PRD
        </Link>
      </div>

      <DocumentRenderer content={content} />
    </div>
  );
}
