import { createClient } from "@/lib/supabase/server";

export async function getDecisionsByProject(projectId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("decisions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

