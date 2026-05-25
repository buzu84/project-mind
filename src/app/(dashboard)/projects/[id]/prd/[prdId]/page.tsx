import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { IconArrowLeft } from "@/components/icons";
import { DocumentRenderer } from "@/components/document-renderer";
import { CopyMarkdownButton } from "@/components/copy-markdown-button";

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
  const productDesc = prd.input?.productDescription;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to {project.name}
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 break-words">
            {productName}
          </h1>
          {productDesc && (
            <p className="mt-1 max-w-xl text-sm text-gray-500 leading-relaxed">{productDesc}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="info">PRD</Badge>
            {prd.input?.targetAudience && (
              <Badge variant="default">{prd.input.targetAudience}</Badge>
            )}
            <span className="text-xs text-gray-400">·</span>
            <p className="text-xs text-gray-400">
              <time suppressHydrationWarning dateTime={prd.created_at}>
                {new Date(prd.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <CopyMarkdownButton getMarkdown={content} />
          <Link
            href={`/projects/${project.id}/prd`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
          >
            + Generate another
          </Link>
        </div>
      </div>

      <DocumentRenderer content={content} />
    </div>
  );
}
