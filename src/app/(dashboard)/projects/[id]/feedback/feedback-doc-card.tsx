"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IconClock } from "@/components/icons";
import { CharacterCounter } from "@/components/ui/character-counter";
import { MinLengthHint } from "@/components/ui/min-length-hint";
import { updateFeedbackDocument } from "./actions";
import { DeleteFeedbackButton } from "./delete-button";
import { useToast } from "@/components/ui/toast";
import { formatDate, toISOString } from "@/lib/format-date";
import { focusAfterPaint } from "@/lib/focus-utils";
import {
  FEEDBACK_TITLE_MIN,
  FEEDBACK_TITLE_MAX,
  FEEDBACK_CONTENT_MIN,
  FEEDBACK_CONTENT_MAX,
  FEEDBACK_CONTENT_QUALITY_HELPER,
} from "@/lib/validations/feedback";

const SOURCE_LABELS: Record<string, string> = {
  customer_interview: "Customer Interview",
  support_ticket: "Support Ticket",
  app_review: "App Review",
  sales_call: "Sales Call",
  internal_note: "Internal Note",
};

const SOURCE_BADGES: Record<string, "info" | "success" | "warning" | "default"> = {
  customer_interview: "info",
  support_ticket: "warning",
  app_review: "success",
  sales_call: "info",
  internal_note: "default",
};

const SOURCES = [
  { value: "", label: "Select source (optional)" },
  { value: "customer_interview", label: "Customer Interview" },
  { value: "support_ticket", label: "Support Ticket" },
  { value: "app_review", label: "App Review" },
  { value: "sales_call", label: "Sales Call" },
  { value: "internal_note", label: "Internal Note" },
];

interface FeedbackDoc {
  id: string;
  title: string;
  content: string;
  source: string | null;
  created_at: string;
}

interface FeedbackDocCardProps {
  doc: FeedbackDoc;
  projectId: string;
}

export function FeedbackDocCard({ doc, projectId }: FeedbackDocCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const editTriggerRef = useRef<HTMLButtonElement>(null);
  const editTitleInputRef = useRef<HTMLInputElement>(null);
  const cardHeadingRef = useRef<HTMLHeadingElement>(null);

  // Controlled inputs for live validation
  const [editTitle, setEditTitle] = useState(doc.title);
  const [editContent, setEditContent] = useState(doc.content);
  const [titleBlurred, setTitleBlurred] = useState(false);
  const [contentBlurred, setContentBlurred] = useState(false);

  const titleError =
    titleBlurred && editTitle.trim().length < FEEDBACK_TITLE_MIN
      ? `Title must be at least ${FEEDBACK_TITLE_MIN} characters.`
      : null;
  const contentError =
    contentBlurred && editContent.trim().length < FEEDBACK_CONTENT_MIN
      ? `Content must be at least ${FEEDBACK_CONTENT_MIN} characters.`
      : null;
  const isEditValid =
    editTitle.trim().length >= FEEDBACK_TITLE_MIN &&
    editContent.trim().length >= FEEDBACK_CONTENT_MIN;

  function handleCancel() {
    setIsEditing(false);
    setError(null);
    setFieldErrors({});
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setTitleBlurred(false);
    setContentBlurred(false);
    focusAfterPaint(() => editTriggerRef.current);
  }

  function startEditing() {
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setTitleBlurred(false);
    setContentBlurred(false);
    setError(null);
    setFieldErrors({});
    setIsEditing(true);
    focusAfterPaint(() => editTitleInputRef.current);
  }

  function handleSave(formData: FormData) {
    setError(null);
    setFieldErrors({});
    setTitleBlurred(true);
    setContentBlurred(true);
    if (!isEditValid) return;

    startTransition(async () => {
      const result = await updateFeedbackDocument(projectId, doc.id, formData);
      if (result.success) {
        setIsEditing(false);
        setError(null);
        setFieldErrors({});
        toast("Feedback updated!");
        router.refresh();
        focusAfterPaint(() => cardHeadingRef.current);
      } else {
        setError(result.error ?? "Update failed");
        if (result.fieldErrors) setFieldErrors(result.fieldErrors as Record<string, string[]>);
      }
    });
  }

  if (isEditing) {
    return (
      <Card>
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Edit Feedback</h4>
          <p className="mt-0.5 text-xs text-gray-500">{FEEDBACK_CONTENT_QUALITY_HELPER}</p>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <form ref={formRef} action={handleSave} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Input
                ref={editTitleInputRef}
                id={`title-${doc.id}`}
                name="title"
                label="Title *"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => setTitleBlurred(true)}
                error={titleError ?? fieldErrors.title?.[0]}
                required
                maxLength={FEEDBACK_TITLE_MAX}
              />
              <div className="mt-1 flex justify-end">
                <CharacterCounter current={editTitle.length} max={FEEDBACK_TITLE_MAX} />
              </div>
            </div>
            <div>
              <label htmlFor={`source-${doc.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                Source
              </label>
              <select
                id={`source-${doc.id}`}
                name="source"
                defaultValue={doc.source ?? ""}
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
              id={`content-${doc.id}`}
              name="content"
              label="Content *"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={() => setContentBlurred(true)}
              className="min-h-[160px]"
              error={contentError ?? fieldErrors.content?.[0]}
              required
              maxLength={FEEDBACK_CONTENT_MAX}
            />
            <div className="mt-1 flex items-center justify-between">
              <MinLengthHint current={editContent.trim().length} min={FEEDBACK_CONTENT_MIN} />
              <CharacterCounter current={editContent.length} max={FEEDBACK_CONTENT_MAX} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isPending} disabled={isPending || !isEditValid}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="group">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 ref={cardHeadingRef} tabIndex={-1} className="text-sm font-semibold text-gray-900 truncate focus:outline-none">{doc.title}</h4>
            {doc.source && (
              <Badge variant={SOURCE_BADGES[doc.source] ?? "default"}>
                {SOURCE_LABELS[doc.source] ?? doc.source}
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
            {doc.content}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
            <IconClock className="h-3 w-3" />
            <time dateTime={toISOString(doc.created_at)}>
              {formatDate(doc.created_at)}
            </time>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 sm:ml-4">
          <button
            ref={editTriggerRef}
            type="button"
            onClick={startEditing}
            className="text-xs text-gray-400 hover:text-brand-600 transition sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            aria-label={`Edit ${doc.title}`}
          >
            Edit
          </button>
          <DeleteFeedbackButton projectId={projectId} documentId={doc.id} />
        </div>
      </div>
    </Card>
  );
}

