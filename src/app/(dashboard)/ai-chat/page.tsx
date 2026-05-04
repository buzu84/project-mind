import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { GlobalChatClient } from "./global-chat-client";

export const dynamic = "force-dynamic";

export default async function AIChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const supabase = createClient();
  const { data: rawMessages } = await supabase
    .from("global_chat_messages")
    .select("id, role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const initialMessages = ((rawMessages ?? []) as Array<{ id: string; role: string; content: string; created_at: string }>).map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    createdAt: m.created_at,
  }));

  return (
    <div className="mx-auto max-w-3xl h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
        <span className="text-xs text-gray-400">
          {initialMessages.length} messages
        </span>
      </div>

      <GlobalChatClient initialMessages={initialMessages} />
    </div>
  );
}
