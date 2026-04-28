import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconArrowLeft, IconClock, IconDocument } from "@/components/icons";
import { FeedbackForm } from "./feedback-form";
import { DeleteFeedbackButton } from "./delete-button";

const SOURCE_LABELS: Record<string, string> = {
  customer_interview: "Customer Interview",
  support_ticket: "Support Ticket",
  app_review: "App Review",
  sales_call: "Sales Call",
  internal_note: "Internal Note",
};

const SOURCE_BADGES: Record<string, "info" | "success" | "warning" | "default"> = {
  customer_interview: "info",
  support_ticket: "warning",
  app_review: "success",
  sales_call: "info",
  internal_note: "default",
};

export default async function FeedbackPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const supabase = createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  const { data: documents } = await supabase
    .from("feedback_documents")
    .select("id, title, content, source, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const docs = (documents ?? []) as Array<{
    id: string;
    title: string;
    content: string;
    source: string | null;
    created_at: string;
  }>;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <IconArrowLeft className="h-4 w-4" />
        Back to {project.name}
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Feedback & Research</h2>
            <p className="mt-1 text-sm text-gray-500">
              Add customer feedback, interview notes, and research for <strong>{project.name}</strong>. The AI uses these when answering your questions.
            </p>
          </div>
          <Badge variant="info">{docs.length} document{docs.length !== 1 ? "s" : ""}</Badge>
        </div>
      </div>

      {/* Add new document */}
      <FeedbackForm projectId={project.id} />

      {/* Document list */}
      {docs.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <IconDocument className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">No feedback yet</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Add customer interviews, support tickets, app reviews, or research notes above.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {docs.map((doc) => (
            <Card key={doc.id} className="group">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{doc.title}</h4>
                    {doc.source && (
                      <Badge variant={SOURCE_BADGES[doc.source] ?? "default"}>
                        {SOURCE_LABELS[doc.source] ?? doc.source}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
                    {doc.content}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                    <IconClock className="h-3 w-3" />
                    {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                </div>
                <DeleteFeedbackButton
                  projectId={project.id}
                  documentId={doc.id}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
