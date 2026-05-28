"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { ContextSectionKey } from "@/lib/context/types";
import type { ActionResult } from "@/lib/validations/project";
import { contextSchema, CONTEXT_SECTION_MAX } from "@/lib/validations/context";

export async function saveProjectContext(
  projectId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const raw: Record<string, string> = {};
    const keys: ContextSectionKey[] = [
      "product_overview", "target_personas", "current_metrics", "pain_points",
      "competitors", "strategic_goals", "constraints", "open_questions",
    ];
    for (const key of keys) {
      raw[key] = (formData.get(key) as string) ?? "";
    }

    const parsed = contextSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: `Validation failed. Each section must be under ${CONTEXT_SECTION_MAX} characters.` };
    }

    const supabase = createClient();

    // Verify ownership: current user must own the project
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return { success: false, error: "Project not found." };
    }


    const { error } = await supabase
      .from("project_context")
      .upsert(
        { project_id: projectId, ...parsed.data, updated_at: new Date().toISOString() },
        { onConflict: "project_id" },
      );

    if (error) {
      console.error("[project-context] Save failed:", error.message);
      return { success: false, error: "Could not save context. Please try again." };
    }

    revalidatePath("/projects/" + projectId);
    revalidatePath("/projects/" + projectId + "/context");
    return { success: true };
  } catch (err) {
    console.error("[project-context] Unexpected error:", err);
    return { success: false, error: "Could not save context. Please try again." };
  }
}
