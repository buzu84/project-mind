"use client";

import { useState, useTransition, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconPlus } from "@/components/icons";
import { createFeedbackDocument } from "./actions";

const SOURCES = [
  { value: "", label: "Select source (optional)" },
  { value: "customer_interview", label: "Customer Interview" },
  { value: "support_ticket", label: "Support Ticket" },
  { value: "app_review", label: "App Review" },
  { value: "sales_call", label: "Sales Call" },
  { value: "internal_note", label: "Internal Note" },
];

interface FeedbackFormProps {
  projectId: string;
}

export function FeedbackForm({ projectId }: FeedbackFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <IconPlus className="h-4 w-4" />
        Add Feedback
      </Button>
    );
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createFeedbackDocument(projectId, formData);
      setResult(res);
      if (res.success) {
        formRef.current?.reset();
        setIsOpen(false);
        setResult(null);
      }
    });
  }

  const fieldError = (field: string) => result?.fieldErrors?.[field]?.[0];

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">New Feedback Document</h3>
        <button
          type="button"
          onClick={() => { setIsOpen(false); setResult(null); }}
          className="text-sm text-gray-400 hover:text-gray-600 transition"
        >
          Cancel
        </button>
      </div>

      {result?.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      )}

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="title"
            name="title"
            label="Title *"
            placeholder="e.g. Interview with Enterprise Customer"
            error={fieldError("title")}
            required
          />
          <div>
            <label htmlFor="source" className="mb-1 block text-sm font-medium text-gray-700">
              Source
            </label>
            <select
              id="source"
              name="source"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <Textarea
          id="content"
          name="content"
          label="Content *"
          placeholder="Paste the full feedback, interview transcript, review text, or notes here..."
          className="min-h-[200px]"
          error={fieldError("content")}
          required
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => { setIsOpen(false); setResult(null); }}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending} disabled={isPending}>
            Save Document
          </Button>
        </div>
      </form>
    </Card>
  );
}
