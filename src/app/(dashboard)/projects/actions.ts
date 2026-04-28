"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isDevMode } from "@/lib/auth";
import { projectSchema, type ActionResult } from "@/lib/validations/project";

// ─── Helpers ─────────────────────────────────────────────────────────

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

    console.debug("[projects] createProject called by:", user.email, "| mock:", isDevMode());

    const parsed = parseProjectForm(formData);
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    console.debug("[projects] Inserting project:", parsed.data.name, "for user_id:", user.id);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...parsed.data, user_id: user.id })
      .select("id")
      .single();

    if (error) {
      console.error("[projects] Supabase insert error:", {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      });
      const detail = isDevMode() ? ` (${error.message})` : "";
      return { success: false, error: `Could not create project.${detail}` };
    }

    if (!data?.id) {
      // Mock Supabase client returns null data — redirect to project list in dev
      if (isDevMode()) {
        console.debug("[projects] Mock client — no real data persisted, redirecting to /projects");
        revalidatePath("/projects");
        redirect("/projects");
      }
      console.error("[projects] Insert returned no data");
      return { success: false, error: "Could not create project. No data returned." };
    }

    revalidatePath("/projects");
    redirect(`/projects/${data.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[projects] Unexpected error in createProject:", err);
    return { success: false, error: "Could not create project. Please try again." };
  }
}

// ─── Update ─────────��───────────────────────────────────────────────

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
      const detail = isDevMode() ? ` (${error.message})` : "";
      return { success: false, error: `Could not update project.${detail}` };
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
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[projects] Unexpected error in deleteProject:", err);
    return { success: false, error: "Could not delete project. Please try again." };
  }
}
