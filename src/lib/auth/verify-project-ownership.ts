import { createClient } from "@/lib/supabase/server";

/**
 * Verify that a project exists and belongs to the given user.
 *
 * This is the canonical ownership check for all project-scoped mutations.
 * Child tables like `decisions`, `roadmaps`, and `feedback_documents` have
 * NO `user_id` column — ownership is inherited through `project_id` →
 * `projects.user_id`. Mutations on those tables must call this function
 * before any insert/update/delete.
 *
 * Returns `true` if the project is owned by the user, `false` otherwise.
 * Does not expose whether the project exists for another user (prevents
 * resource enumeration).
 */
export async function verifyProjectOwnership(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  return !!data;
}

