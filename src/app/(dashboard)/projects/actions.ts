"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isDevMode } from "@/lib/auth";
import { projectSchema, type ActionResult } from "@/lib/validations/project";

function parseProjectForm(formData: FormData) {
  return projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    target_users: formData.get("targetUsers"),
    market: formData.get("market"),
    business_model: formData.get("businessModel"),
    goals: formData.get("goals"),
  });
}

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as any).digest === "string" &&
    (err as any).digest.startsWith("NEXT_REDIRECT")
  );
}

// ─── Create ─────────────────────────────────────────────────────────

export async function createProject(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const parsed = parseProjectForm(formData);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...parsed.data, user_id: user.id })
      .select("id")
      .single();

    if (error) {
      console.error("[projects] Create failed:", error.message);
      const detail = isDevMode() ? ` (${error.message})` : "";
      return { success: false, error: `Could not create project.${detail}` };
    }

    if (!data?.id) {
      return { success: false, error: "Could not create project. No data returned." };
    }

    revalidatePath("/projects");
    console.debug("[createProject] SUCCESS, projectId:", data.id);
    return { success: true, projectId: data.id };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[projects] Unexpected error in createProject:", err);
    return { success: false, error: "Could not create project. Please try again." };
  }
}

// ─── Update ─────────────────────────────────────────────────────────

export async function updateProject(
  projectId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const parsed = parseProjectForm(formData);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("projects")
      .update(parsed.data)
      .eq("id", projectId);

    if (error) {
      console.error("[projects] Update failed:", error.message);
      return { success: false, error: "Could not update project. Please try again." };
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    return { success: true };
  } catch (err) {
    console.error("[projects] Unexpected error in updateProject:", err);
    return { success: false, error: "Could not update project. Please try again." };
  }
}

// ─── Delete ─────────────────────────────────────────────────────────

export async function deleteProject(projectId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const supabase = createClient();
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      console.error("[projects] Delete failed:", error.message);
      return { success: false, error: "Could not delete project. Please try again." };
    }

    revalidatePath("/projects");
    redirect("/projects");
    // redirect throws, but satisfy TS return type
    return { success: true };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[projects] Unexpected error:", err);
    return { success: false, error: "Could not delete project. Please try again." };
  }
}
