import { createClient } from "@/lib/supabase/server";

export async function getProjectsByUserId(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("*, decisions(count), feature_ideas(count), messages(count), insights(count)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getProjectById(projectId: string, userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("*, decisions(id, type, created_at), feature_ideas(count), messages(count), insights(count)")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  return data;
}

export async function createProject(
  data: {
    name: string;
    description?: string;
    targetUsers?: string;
    market?: string;
    businessModel?: string;
    goals?: string;
  },
  userId: string,
) {
  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .insert({ ...data, userId })
    .select("*")
    .single();
  return project;
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    targetUsers?: string;
    market?: string;
    businessModel?: string;
    goals?: string;
  },
) {
  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .update(data)
    .eq("id", projectId)
    .eq("userId", userId)
    .select("*")
    .single();
  return project;
}

export async function deleteProject(projectId: string, userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("userId", userId);
  return data;
}
