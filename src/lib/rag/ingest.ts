import { createClient } from "@/lib/supabase/server";
import { chunkDocument } from "./chunker";
import { generateEmbeddings } from "./embeddings";

/**
 * Ingest a feedback document: chunk it, generate embeddings, store in vector DB.
 *
 * @param documentId - The feedback_documents row ID
 * @param projectId - The project this document belongs to
 * @param content - The full document text
 * @param userId - The user performing the action (for usage tracking)
 */
export async function ingestDocument(
  documentId: string,
  projectId: string,
  content: string,
  userId?: string,
): Promise<{ chunksCreated: number }> {
  const chunks = chunkDocument(content);

  if (chunks.length === 0) {
    return { chunksCreated: 0 };
  }


  // Generate embeddings for all chunks
  const embeddings = await generateEmbeddings(
    chunks.map((c) => c.content),
    userId ? { userId, projectId, feature: "document_embedding" } : undefined,
  );

  // Prepare rows for batch insert
  const rows = chunks.map((chunk, i) => ({
    document_id: documentId,
    project_id: projectId,
    content: chunk.content,
    embedding: `[${embeddings[i].join(",")}]`,
    token_count: chunk.tokenCount,
    chunk_index: chunk.index,
  }));

  const supabase = createClient();
  const { error } = await supabase.from("document_chunks").insert(rows);

  if (error) {
    console.error("[rag] Failed to store chunks:", error.message);
    throw new Error(`Failed to store document chunks: ${error.message}`);
  }

  return { chunksCreated: rows.length };
}

/**
 * Remove all chunks for a document (called on document deletion).
 * Note: This also happens automatically via ON DELETE CASCADE in the DB,
 * but we call it explicitly to be safe.
 */
export async function removeDocumentChunks(documentId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("document_chunks").delete().eq("document_id", documentId);
}
