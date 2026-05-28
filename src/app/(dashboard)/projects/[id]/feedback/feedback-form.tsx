"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconPlus } from "@/components/icons";
import { CharacterCounter } from "@/components/ui/character-counter";
import { MinLengthHint } from "@/components/ui/min-length-hint";
import { createFeedbackDocument } from "./actions";
import { useToast } from "@/components/ui/toast";
import {
  FEEDBACK_TITLE_MIN,
  FEEDBACK_TITLE_MAX,
  FEEDBACK_CONTENT_MIN,
  FEEDBACK_CONTENT_MAX,
  FEEDBACK_CONTENT_QUALITY_HELPER,
} from "@/lib/validations/feedback";
import { focusAfterPaint } from "@/lib/focus-utils";

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
  const [serverError, setServerError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Controlled inputs for live validation
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [titleBlurred, setTitleBlurred] = useState(false);
  const [contentBlurred, setContentBlurred] = useState(false);

  // Focus the title input when the form opens
  useEffect(() => {
    if (isOpen) {
      focusAfterPaint(() => titleInputRef.current);
    }
  }, [isOpen]);

  const titleError =
    titleBlurred && title.trim().length < FEEDBACK_TITLE_MIN
      ? `Title must be at least ${FEEDBACK_TITLE_MIN} characters.`
      : null;
  const contentError =
    contentBlurred && content.trim().length < FEEDBACK_CONTENT_MIN
      ? `Content must be at least ${FEEDBACK_CONTENT_MIN} characters.`
      : null;
  const isFormValid =
    title.trim().length >= FEEDBACK_TITLE_MIN &&
    content.trim().length >= FEEDBACK_CONTENT_MIN;

  if (!isOpen) {
    return (
      <Button ref={addButtonRef} data-feedback-add-btn onClick={() => setIsOpen(true)} className="gap-2">
        <IconPlus className="h-4 w-4" />
        Add Feedback
      </Button>
    );
  }

  function handleSubmit(formData: FormData) {
    // Show errors if user bypassed blur
    setTitleBlurred(true);
    setContentBlurred(true);
    if (!isFormValid) return;

    setServerError(null);
    startTransition(async () => {
      const res = await createFeedbackDocument(projectId, formData);
      if (res.success) {
        formRef.current?.reset();
        setTitle("");
        setContent("");
        setTitleBlurred(false);
        setContentBlurred(false);
        setIsOpen(false);
        setServerError(null);
        toast("Feedback document saved!");
        focusAfterPaint(() => addButtonRef.current);
      } else {
        setServerError(res.error ?? res.fieldErrors?.title?.[0] ?? res.fieldErrors?.content?.[0] ?? "Could not save feedback.");
      }
    });
  }

  function handleCancel() {
    setIsOpen(false);
    setServerError(null);
    setTitle("");
    setContent("");
    setTitleBlurred(false);
    setContentBlurred(false);
    focusAfterPaint(() => addButtonRef.current);
  }

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">New Feedback Document</h3>
        <p className="mt-1 text-xs text-gray-500">{FEEDBACK_CONTENT_QUALITY_HELPER}</p>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {serverError}
        </div>
      )}

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input
              ref={titleInputRef}
              id="title"
              name="title"
              label="Title *"
              placeholder="e.g. Interview with Enterprise Customer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTitleBlurred(true)}
              error={titleError ?? undefined}
              required
              maxLength={FEEDBACK_TITLE_MAX}
            />
            <div className="mt-1 flex justify-end">
              <CharacterCounter current={title.length} max={FEEDBACK_TITLE_MAX} />
            </div>
          </div>
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

        <div>
          <Textarea
            id="content"
            name="content"
            label="Content *"
            placeholder="Paste the full feedback, interview transcript, review text, or notes here..."
            className="min-h-[200px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => setContentBlurred(true)}
            error={contentError ?? undefined}
            required
            maxLength={FEEDBACK_CONTENT_MAX}
          />
          <div className="mt-1 flex items-center justify-between">
            <MinLengthHint current={content.trim().length} min={FEEDBACK_CONTENT_MIN} />
            <CharacterCounter current={content.length} max={FEEDBACK_CONTENT_MAX} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending} disabled={isPending || !isFormValid}>
            Save Document
          </Button>
        </div>
      </form>
    </Card>
  );
}
