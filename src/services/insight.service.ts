import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

// ─── Insights ───────────────────────────────────────────────────────

export async function getInsightsByProject(projectId: string, type?: string) {
  const supabase = createClient();
  let query = supabase
    .from("insights")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (type) query = query.eq("type", type);
  const { data } = await query;
  return data ?? [];
}

export async function createInsight(data: {
  project_id: string;
  type: string;
  title: string;
  content: string;
  metadata?: Json;
}) {
  const supabase = createClient();
  const { data: insight } = await supabase
    .from("insights")
    .insert(data)
    .select("*")
    .single();
  return insight;
}

export async function deleteInsight(id: string) {
  const supabase = createClient();
  await supabase.from("insights").delete().eq("id", id);
}
