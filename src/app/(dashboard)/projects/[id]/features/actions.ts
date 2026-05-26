"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isDevMode } from "@/lib/auth";
import { verifyProjectOwnership } from "@/lib/auth/verify-project-ownership";
import type { ActionResult } from "@/lib/validations/project";

const featureSchema = z.object({
  name: z.string().min(3, "Feature name must be at least 3 characters.").max(200, "Feature name must be under 200 characters."),
  description: z.string().min(20, "Describe the feature in at least one sentence so AI can score it accurately.").max(2000, "Description must be under 2000 characters."),
});

export async function createFeatureIdea(
  projectId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const isOwner = await verifyProjectOwnership(projectId, user.id);
    if (!isOwner) return { success: false, error: "Project not found." };

    const parsed = featureSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
    });

    if (!parsed.success) {
      return { success: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("feature_ideas")
      .insert({
        project_id: projectId,
        name: parsed.data.name,
        description: parsed.data.description,
        reach: 0,
        impact: 0,
        confidence: 0,
        effort: 0,
        rice_score: 0,
        ice_score: 0,
        ai_commentary: null,
        status: "idea",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[features] Insert failed:", error.message);
      const detail = isDevMode() ? ` (${error.message})` : "";
      return { success: false, error: `Could not add feature.${detail}` };
    }

    revalidatePath(`/projects/${projectId}/features`);
    return { success: true, data: { id: data?.id } };
  } catch (err) {
    console.error("[features] Unexpected error:", err);
    return { success: false, error: "Could not add feature." };
  }
}

export async function updateFeatureIdea(
  projectId: string,
  featureId: string,
  data: { name: string; description: string },
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const isOwner = await verifyProjectOwnership(projectId, user.id);
    if (!isOwner) return { success: false, error: "Project not found." };

    const parsed = featureSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }

    const supabase = createClient();
    const { data: updated, error } = await supabase
      .from("feature_ideas")
      .update({
        name: parsed.data.name,
        description: parsed.data.description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", featureId)
      .eq("project_id", projectId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[features] Update failed:", error.message);
      const detail = isDevMode() ? ` (${error.message})` : "";
      return { success: false, error: `Could not update feature.${detail}` };
    }

    if (!updated) {
      return { success: false, error: "Feature not found." };
    }

    revalidatePath(`/projects/${projectId}/features`);
    return { success: true };
  } catch (err) {
    console.error("[features] Unexpected error:", err);
    return { success: false, error: "Could not update feature." };
  }
}

export async function deleteFeatureIdea(
  projectId: string,
  featureId: string,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const isOwner = await verifyProjectOwnership(projectId, user.id);
    if (!isOwner) return { success: false, error: "Project not found." };

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
