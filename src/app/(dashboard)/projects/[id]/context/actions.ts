"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { ContextSectionKey } from "@/lib/context/types";
import type { ActionResult } from "@/lib/validations/project";

const contextSchema = z.object({
  product_overview: z.string().max(3000).optional().transform((v) => v || null),
  target_personas: z.string().max(3000).optional().transform((v) => v || null),
  current_metrics: z.string().max(3000).optional().transform((v) => v || null),
  pain_points: z.string().max(3000).optional().transform((v) => v || null),
  competitors: z.string().max(3000).optional().transform((v) => v || null),
  strategic_goals: z.string().max(3000).optional().transform((v) => v || null),
  constraints: z.string().max(3000).optional().transform((v) => v || null),
  open_questions: z.string().max(3000).optional().transform((v) => v || null),
});

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
      return { success: false, error: "Validation failed. Each section must be under 3000 characters." };
    }

    const supabase = createClient();

    // Verify ownership: current user must own the project
    const { data: project } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return { success: false, error: "Project not found." };
    }

    if (project.user_id !== user.id) {
      return { success: false, error: "You do not have access to this project." };
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
