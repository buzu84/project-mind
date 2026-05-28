import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { IconArrowLeft } from "@/components/icons";
import { ChatClient } from "./chat-client";

export default async function ProjectChatPage({
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
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  // Load the latest 100 messages (descending) then reverse for chronological UI order
  const { data: rawMessages } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Non-mutating reverse so the UI displays oldest-first (chronological)
  const messages = [...(rawMessages ?? [])].reverse();

  const serializedMessages = (messages as Array<{ id: string; role: string; content: string; created_at: string }>).map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
    createdAt: m.created_at,
  }));

  return (
    <div className="mx-auto max-w-3xl h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <IconArrowLeft className="h-4 w-4" />
          {project.name}
        </Link>
        <span className="text-xs text-gray-400">
          {serializedMessages.filter((m) => m.role !== "system").length} messages
        </span>
      </div>

      <ChatClient
        projectId={project.id}
        projectName={project.name}
        initialMessages={serializedMessages}
      />
    </div>
  );
}

