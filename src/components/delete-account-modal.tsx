"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface DeleteAccountModalProps {
  onClose: () => void;
}

export function DeleteAccountModal({ onClose }: DeleteAccountModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Focus input on mount + close on Escape
  useEffect(() => {
    inputRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && status !== "loading") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, status]);

  const isConfirmed = confirmation === "DELETE";

  async function handleDelete() {
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to delete account.");
        setStatus("error");
        return;
      }

      // Success — redirect to landing
      router.push("/?deleted=true");
      router.refresh();
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2
          id="delete-account-title"
          className="text-lg font-semibold text-red-600"
        >
          Delete Account
        </h2>

        <div className="mt-4 space-y-3 text-sm text-gray-600">
          <p>
            This action is <strong className="text-red-600">permanent and irreversible</strong>.
          </p>
          <p>All your data will be deleted immediately, including:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-500">
            <li>All projects and project context</li>
            <li>Feedback documents and research</li>
            <li>AI insights, roadmaps, and PRDs</li>
            <li>Feature ideas and scoring data</li>
            <li>Chat history and multi-agent reviews</li>
            <li>AI usage records</li>
            <li>Your account and login credentials</li>
          </ul>
          <p>You will not be able to recover any data after deletion.</p>
        </div>

        <div className="mt-5">
          <label
            htmlFor="delete-confirm"
            className="block text-sm font-medium text-gray-700"
          >
            Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
          </label>
          <input
            ref={inputRef}
            id="delete-confirm"
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            disabled={status === "loading"}
          />
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={status === "loading"}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={!isConfirmed || status === "loading"}
            isLoading={status === "loading"}
          >
            Delete my account
          </Button>
        </div>
      </div>
    </div>
  );
}

