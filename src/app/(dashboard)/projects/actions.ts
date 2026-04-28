"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

// ─── Validation Schemas ─────────────────────────────────────────────

export const projectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Name must be under 100 characters"),
  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .optional()
    .transform((v) => v || undefined),
  target_users: z
    .string()
    .max(300, "Target users must be under 300 characters")
    .optional()
    .transform((v) => v || undefined),
  market: z
    .string()
    .max(200, "Market must be under 200 characters")
    .optional()
    .transform((v) => v || undefined),
  business_model: z
    .string()
    .max(200, "Business model must be under 200 characters")
    .optional()
    .transform((v) => v || undefined),
  goals: z
    .string()
    .max(500, "Goals must be under 500 characters")
    .optional()
    .transform((v) => v || undefined),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

export type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// ─── Create ─────────────────────────────────────────────────────────

export async function createProject(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    target_users: formData.get("targetUsers"),
    market: formData.get("market"),
    business_model: formData.get("businessModel"),
    goals: formData.get("goals"),
  });

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

  if (error) return { success: false, error: error.message };

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

// ─── Update ─────────────────────────────────────────────────────────

export async function updateProject(
  projectId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    target_users: formData.get("targetUsers"),
    market: formData.get("market"),
    business_model: formData.get("businessModel"),
    goals: formData.get("goals"),
  });

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

  if (error) return { success: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { success: true };
}

// ─── Delete ─────────────────────────────────────────────────────────

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/projects");
  redirect("/projects");
}
