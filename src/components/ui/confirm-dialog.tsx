"use client";

import { useState, useEffect, useRef, useId, useCallback, cloneElement, type ReactElement, type RefObject } from "react";
import { Button } from "./button";
import { focusAfterPaint } from "@/lib/focus-utils";

interface ConfirmDialogProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** Must be a single React element (e.g. `<Button>` or `<button>`). */
  trigger: ReactElement<Record<string, unknown>>;
  variant?: "danger" | "primary";
  /** Optional ref to a fallback element to focus if the trigger is removed from DOM after confirm (e.g. deleted item). */
  focusFallbackRef?: RefObject<HTMLElement | null>;
}

export function ConfirmDialog({
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  onConfirm,
  trigger,
  variant = "danger",
  focusFallbackRef,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Restore focus to trigger (or fallback) when dialog closes.
  // Uses double-rAF so focus runs after React has flushed the DOM update.
  const restoreFocus = useCallback((confirmedAction: boolean) => {
    focusAfterPaint(() => {
      const trigger = triggerRef.current;
      if (trigger && trigger.isConnected) return trigger;
      // Trigger was removed (e.g. item deleted) — try fallback
      if (confirmedAction && focusFallbackRef?.current?.isConnected) {
        return focusFallbackRef.current;
      }
      return null;
    });
  }, [focusFallbackRef]);

  // Focus cancel button on open, handle Escape + focus trap
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        setOpen(false);
        restoreFocus(false);
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, restoreFocus]);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
      restoreFocus(true);
    }
  }

  function handleCancel() {
    setOpen(false);
    restoreFocus(false);
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
        // Store the trigger element for focus restoration
        triggerRef.current = e.currentTarget as HTMLElement;
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
            onClick={() => !loading && handleCancel()}
            aria-hidden="true"
          />
          <div ref={panelRef} className="relative z-10 w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 id={titleId} className="text-base font-semibold text-gray-900">{title}</h3>
            <p id={descId} className="mt-2 text-sm text-gray-600">{message}</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                ref={cancelRef}
                size="sm"
                variant="secondary"
                onClick={handleCancel}
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
