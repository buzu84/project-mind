import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { IconArrowLeft } from "@/components/icons";
import { ChatClient } from "./chat-client";

export default async function ProjectChatPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/sign-in");

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, name: true },
  });

  if (!project) notFound();

  const messages = await prisma.message.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  const serializedMessages = messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
    createdAt: m.createdAt.toISOString(),
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
          {messages.filter((m) => m.role !== "system").length} messages
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

