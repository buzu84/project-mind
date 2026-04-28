"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isDevMode } from "@/lib/auth";
import type { ActionResult } from "@/lib/validations/project";
import { ingestDocument, removeDocumentChunks } from "@/lib/rag";

const VALID_SOURCES = [
  "customer_interview",
  "support_ticket",
  "app_review",
  "sales_call",
  "internal_note",
] as const;

const feedbackSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required").max(50000),
  source: z.enum(VALID_SOURCES).optional().transform((v) => v || null),
});

export async function createFeedbackDocument(
  projectId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const parsed = feedbackSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
      source: formData.get("source") || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("feedback_documents")
      .insert({ project_id: projectId, ...parsed.data })
      .select("id")
      .single();

    if (error) {
      console.error("[feedback] Insert failed:", error.message);
      const detail = isDevMode() ? ` (${error.message})` : "";
      return { success: false, error: `Could not save feedback.${detail}` };
    }

    // Trigger async RAG ingestion (chunk + embed)
    if (data?.id) {
      try {
        await ingestDocument(data.id, projectId, parsed.data.content);
      } catch (ragErr) {
        // Don't fail the whole action if embedding fails — document is still saved
        console.error("[feedback] RAG ingestion failed (document saved):", ragErr);
      }
    }

    revalidatePath(`/projects/${projectId}/feedback`);
    return { success: true };
  } catch (err) {
    console.error("[feedback] Unexpected error:", err);
    return { success: false, error: "Could not save feedback. Please try again." };
  }
}

export async function deleteFeedbackDocument(
  projectId: string,
  documentId: string,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    // Remove chunks first (also handled by CASCADE but explicit is safer)
    try {
      await removeDocumentChunks(documentId);
    } catch {
      // Non-critical — CASCADE will handle it
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("feedback_documents")
      .delete()
      .eq("id", documentId)
      .eq("project_id", projectId);

    if (error) {
      console.error("[feedback] Delete failed:", error.message);
      return { success: false, error: "Could not delete document." };
    }

    revalidatePath(`/projects/${projectId}/feedback`);
    return { success: true };
  } catch (err) {
    console.error("[feedback] Unexpected error:", err);
    return { success: false, error: "Could not delete document." };
  }
}
