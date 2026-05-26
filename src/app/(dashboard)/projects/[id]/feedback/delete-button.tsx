"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteFeedbackDocument } from "./actions";

interface DeleteFeedbackButtonProps {
  projectId: string;
  documentId: string;
}

export function DeleteFeedbackButton({ projectId, documentId }: DeleteFeedbackButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ml-4 flex-shrink-0 text-xs text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
        aria-label="Delete feedback document"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="ml-4 flex flex-shrink-0 items-center gap-2">
      <Button
        size="sm"
        variant="danger"
        isLoading={isPending}
        onClick={() => {
          startTransition(async () => {
            const res = await deleteFeedbackDocument(projectId, documentId);
            if (res.success) {
              toast("Feedback deleted");
              setConfirming(false);
              router.refresh();
            } else {
              toast(res.error ?? "Could not delete document.", "error");
              setConfirming(false);
            }
          });
        }}
      >
        Confirm
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
