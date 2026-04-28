"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isDevMode } from "@/lib/auth";
import type { ActionResult } from "@/lib/validations/project";

const featureSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional().transform((v) => v || null),
});

export async function createFeatureIdea(
  projectId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const parsed = featureSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
    });

    if (!parsed.success) {
      return { success: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("feature_ideas")
      .insert({ project_id: projectId, ...parsed.data });

    if (error) {
      console.error("[features] Insert failed:", error.message);
      const detail = isDevMode() ? ` (${error.message})` : "";
      return { success: false, error: `Could not add feature.${detail}` };
    }

    revalidatePath(`/projects/${projectId}/features`);
    return { success: true };
  } catch (err) {
    console.error("[features] Unexpected error:", err);
    return { success: false, error: "Could not add feature." };
  }
}

export async function deleteFeatureIdea(
  projectId: string,
  featureId: string,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const supabase = createClient();
    const { error } = await supabase
      .from("feature_ideas")
      .delete()
      .eq("id", featureId)
      .eq("project_id", projectId);

    if (error) {
      console.error("[features] Delete failed:", error.message);
      return { success: false, error: "Could not delete feature." };
    }

    revalidatePath(`/projects/${projectId}/features`);
    return { success: true };
  } catch (err) {
    console.error("[features] Unexpected error:", err);
    return { success: false, error: "Could not delete feature." };
  }
}
