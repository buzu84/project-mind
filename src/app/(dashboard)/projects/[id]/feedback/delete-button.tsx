"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteFeedbackDocument } from "./actions";
import { focusAfterPaint } from "@/lib/focus-utils";

interface DeleteFeedbackButtonProps {
  projectId: string;
  documentId: string;
}

export function DeleteFeedbackButton({ projectId, documentId }: DeleteFeedbackButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const cancelConfirm = useCallback(() => {
    setConfirming(false);
    focusAfterPaint(() => deleteTriggerRef.current);
  }, []);

  // Focus Cancel (the safer action) when inline confirmation appears
  useEffect(() => {
    if (confirming) {
      focusAfterPaint(() => cancelRef.current);
    }
  }, [confirming]);

  // Escape key cancels inline confirmation
  useEffect(() => {
    if (!confirming || isPending) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cancelConfirm();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirming, isPending, cancelConfirm]);

  if (!confirming) {
    return (
      <button
        ref={deleteTriggerRef}
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
        variant="ghost"
        ref={cancelRef}
        onClick={cancelConfirm}
      >
        Cancel
      </Button>
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
              focusAfterPaint(() =>
                document.querySelector<HTMLElement>("[data-feedback-add-btn]"),
              );
            } else {
              toast(res.error ?? "Could not delete document.", "error");
              setConfirming(false);
            }
          });
        }}
      >
        Confirm
      </Button>
    </div>
  );
}
