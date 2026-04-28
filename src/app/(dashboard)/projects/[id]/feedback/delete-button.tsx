"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteFeedbackDocument } from "./actions";

interface DeleteFeedbackButtonProps {
  projectId: string;
  documentId: string;
}

export function DeleteFeedbackButton({ projectId, documentId }: DeleteFeedbackButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ml-4 flex-shrink-0 text-xs text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
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
            await deleteFeedbackDocument(projectId, documentId);
            setConfirming(false);
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
