"use client";

import { useState } from "react";
import { copyMarkdownToClipboard } from "@/lib/export/copy-markdown";
import { useToast } from "@/components/ui/toast";

interface CopyMarkdownButtonProps {
  /** Either a static markdown string or a function that produces one lazily */
  getMarkdown: string | (() => string);
  label?: string;
  className?: string;
}

/**
 * Shared button for copying AI-generated content as markdown.
 * Renders as a small secondary-style button with copy/check icon.
 */
export function CopyMarkdownButton({
  getMarkdown,
  label = "Copy Markdown",
  className = "",
}: CopyMarkdownButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const markdown = typeof getMarkdown === "function" ? getMarkdown() : getMarkdown;
    if (!markdown.trim()) {
      toast("Nothing to copy", "error");
      return;
    }
    const ok = await copyMarkdownToClipboard(markdown);
    if (ok) {
      setCopied(true);
      toast("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast("Failed to copy", "error");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${className}`}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? (
        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
      <span className="hidden sm:inline">{copied ? "Copied!" : label}</span>
    </button>
  );
}

