"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isDevMode } from "@/lib/auth";
import { verifyProjectOwnership } from "@/lib/auth/verify-project-ownership";
import type { ActionResult } from "@/lib/validations/project";
import { feedbackSchema } from "@/lib/validations/feedback";
import { ingestDocument, removeDocumentChunks } from "@/lib/rag";



export async function createFeedbackDocument(
  projectId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const isOwner = await verifyProjectOwnership(projectId, user.id);
    if (!isOwner) return { success: false, error: "Project not found or access denied." };

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
        await ingestDocument(data.id, projectId, parsed.data.content, user.id);
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

    const isOwner = await verifyProjectOwnership(projectId, user.id);
    if (!isOwner) return { success: false, error: "Project not found or access denied." };

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

export async function updateFeedbackDocument(
  projectId: string,
  documentId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };

    const isOwner = await verifyProjectOwnership(projectId, user.id);
    if (!isOwner) return { success: false, error: "Project not found or access denied." };

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

    // Fetch old content to detect changes
    const { data: oldDoc } = await supabase
      .from("feedback_documents")
      .select("content")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .single();

    const { data: updated, error } = await supabase
      .from("feedback_documents")
      .update(parsed.data)
      .eq("id", documentId)
      .eq("project_id", projectId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[feedback] Update failed:", error.message);
      const detail = isDevMode() ? ` (${error.message})` : "";
      return { success: false, error: `Could not update feedback.${detail}` };
    }

    if (!updated) {
      return { success: false, error: "Feedback document not found." };
    }

    // If content changed, re-ingest embeddings
    const contentChanged = oldDoc?.content !== parsed.data.content;
    if (contentChanged) {
      try {
        // Remove old chunks then re-ingest
        await removeDocumentChunks(documentId);
        await ingestDocument(documentId, projectId, parsed.data.content, user.id);
      } catch (ragErr) {
        // Document is updated even if re-embedding fails
        console.error("[feedback] Re-embedding failed (document updated):", ragErr);
      }
    }

    revalidatePath(`/projects/${projectId}/feedback`);
    return { success: true };
  } catch (err) {
    console.error("[feedback] Update error:", err);
    return { success: false, error: "Could not update feedback. Please try again." };
  }
}

