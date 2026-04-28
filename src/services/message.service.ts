import { createClient } from "@/lib/supabase/server";

// ─── Messages ───────────────────────────────────────────────────────

export async function getMessagesByProject(projectId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function createMessage(data: {
  project_id: string;
  role: "user" | "assistant" | "system";
  content: string;
}) {
  const supabase = createClient();
  const { data: message } = await supabase
    .from("messages")
    .insert(data)
    .select("*")
    .single();
  return message;
}

export async function deleteMessagesByProject(projectId: string) {
  const supabase = createClient();
  await supabase.from("messages").delete().eq("project_id", projectId);
}
