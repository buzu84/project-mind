"use client";

import { useState, useEffect, useRef, useId, cloneElement, type ReactElement } from "react";
import { Button } from "./button";

interface ConfirmDialogProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** Must be a single React element (e.g. `<Button>` or `<button>`). */
  trigger: ReactElement<Record<string, unknown>>;
  variant?: "danger" | "primary";
}

export function ConfirmDialog({
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  onConfirm,
  trigger,
  variant = "danger",
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  // Focus cancel button on open, handle Escape
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading]);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  // Clone the trigger element to attach click/keyboard handlers directly,
  // avoiding a wrapper element that would create a duplicate tab stop.
  const triggerEl = cloneElement(trigger, {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      // Call the trigger's original onClick if present
      if (typeof trigger.props.onClick === "function") {
        trigger.props.onClick(e);
      }
      if (!e.defaultPrevented) {
        setOpen(true);
      }
    },
  });

  return (
    <>
      {triggerEl}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId}>
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !loading && setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 id={titleId} className="text-base font-semibold text-gray-900">{title}</h3>
            <p id={descId} className="mt-2 text-sm text-gray-600">{message}</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                ref={cancelRef}
                size="sm"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant={variant}
                onClick={handleConfirm}
                isLoading={loading}
                disabled={loading}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
