import { createClient } from "@/lib/supabase/server";

// ─── Feedback Documents ─────────────────────────────────────────────

export async function getDocumentsByProject(projectId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("feedback_documents")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createDocument(data: {
  project_id: string;
  title: string;
  content: string;
  source?: string;
}) {
  const supabase = createClient();
  const { data: doc } = await supabase
    .from("feedback_documents")
    .insert(data)
    .select("*")
    .single();
  return doc;
}

export async function deleteDocument(id: string) {
  const supabase = createClient();
  await supabase.from("feedback_documents").delete().eq("id", id);
}
