"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

interface DeleteDocumentButtonProps {
  projectId: string;
  decisionId: string;
  /** Human-readable type for confirmation copy, e.g. "PRD" or "competitive analysis" */
  documentLabel: string;
  /** Where to navigate after successful deletion */
  redirectTo: string;
}

export function DeleteDocumentButton({
  projectId,
  decisionId,
  documentLabel,
  redirectTo,
}: DeleteDocumentButtonProps) {
  const router = useRouter();
  const { toast } = useToast();

  async function handleDelete() {
    const res = await fetch(
      `/api/decisions/${decisionId}?projectId=${encodeURIComponent(projectId)}`,
      { method: "DELETE" },
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error ?? `Failed to delete ${documentLabel}.`, "error");
      return;
    }

    toast(`${documentLabel} deleted.`);
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <ConfirmDialog
      title={`Delete ${documentLabel}?`}
      message={`This will permanently delete this ${documentLabel}. This action cannot be undone.`}
      confirmLabel="Delete"
      variant="danger"
      onConfirm={handleDelete}
      trigger={
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
          Delete
        </Button>
      }
    />
  );
}

