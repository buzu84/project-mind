"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { IconSparkles, IconUser } from "@/components/icons";
import { formatTime } from "@/lib/format-date";

/* ------------------------------------------------------------------ */
/*  Lightweight markdown renderer for chat messages                    */
/* ------------------------------------------------------------------ */

/** Render inline markdown: **bold**, `code` */
function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*|`.+?`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="rounded bg-gray-100 px-1 py-0.5 text-xs font-mono">{part.slice(1, -1)}</code>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function ChatMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level <= 2
        ? "text-sm font-semibold text-gray-900 mt-3 mb-1"
        : "text-sm font-medium text-gray-800 mt-2 mb-0.5";
      elements.push(<p key={key++} className={cls}><InlineMarkdown text={headingMatch[2]} /></p>);
      i++;
      continue;
    }

    // HR
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      elements.push(<hr key={key++} className="my-2 border-gray-200" />);
      i++;
      continue;
    }

    // Bullet list
    if (/^\s*[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, "").trim());
        i++;
      }
      elements.push(
        <ul key={key++} className="my-1 space-y-0.5 pl-4">
          {items.map((item, j) => (
            <li key={j} className="list-disc text-sm text-gray-600 leading-relaxed marker:text-gray-400">
              <InlineMarkdown text={item} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+[.)]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, "").trim());
        i++;
      }
      elements.push(
        <ol key={key++} className="my-1 space-y-0.5 pl-4">
          {items.map((item, j) => (
            <li key={j} className="list-decimal text-sm text-gray-600 leading-relaxed marker:text-gray-400">
              <InlineMarkdown text={item} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular line
    elements.push(
      <p key={key++} className="text-sm leading-relaxed text-gray-600">
        <InlineMarkdown text={trimmed} />
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
  source?: "real" | "mock";
}

interface ChatShellProps {
  initialMessages: ChatMessage[];
  apiEndpoint: string;
  buildRequestBody: (_message: string) => Record<string, unknown>;
  suggestions: string[];
  emptyTitle: string;
  emptyDescription: string;
  placeholder?: string;
  contextBanner?: React.ReactNode;
}

export function ChatShell({
  initialMessages,
  apiEndpoint,
  buildRequestBody,
  suggestions,
  emptyTitle,
  emptyDescription,
  placeholder = "Ask anything about product management\u2026",
  contextBanner,
}: ChatShellProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    const assistantId = `streaming-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);
    setInput("");
    setIsStreaming(true);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody(content.trim())),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        setError(data.error ?? "Failed to get a response.");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Failed to read response.");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6);
          try {
            const parsed = JSON.parse(payload) as
              | string
              | { done: true; id: string; createdAt?: string; source?: string }
              | { error: string };

            if (typeof parsed === "string") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + parsed } : m,
                ),
              );
            } else if ("done" in parsed && parsed.done) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, id: parsed.id ?? assistantId, createdAt: parsed.createdAt, source: parsed.source as "real" | "mock" | undefined }
                    : m,
                ),
              );
            } else if ("error" in parsed) {
              setError(parsed.error);
            }
          } catch {
            // skip malformed SSE
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — keep partial content
      } else {
        setError("Network error. Please check your connection and try again.");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  const visibleMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      {/* Context banner */}
      {contextBanner}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-1" aria-live="polite" aria-relevant="additions">
        {visibleMessages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
              <IconSparkles className="h-7 w-7 text-brand-600" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">{emptyTitle}</h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">{emptyDescription}</p>
            <div className="mt-8 grid gap-2 sm:grid-cols-2 w-full max-w-lg">
              {suggestions.map((text) => (
                <button
                  key={text}
                  onClick={() => sendMessage(text)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {visibleMessages.length > 0 && (
          <div className="space-y-6 py-4">
            {visibleMessages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                {msg.role === "assistant" ? (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    <IconSparkles className={`h-4 w-4 text-brand-600 ${msg.id.startsWith("streaming-") ? "animate-pulse" : ""}`} />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <IconUser className="h-4 w-4 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {msg.role === "assistant" ? "ProductMind AI" : "You"}
                    </span>
                    {!msg.id.startsWith("streaming-") && !msg.id.startsWith("user-") && msg.createdAt && (
                      <span className="text-xs text-gray-400">
                        {formatTime(msg.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 break-words">
                    {msg.role === "assistant" ? (
                      <ChatMarkdown text={msg.content} />
                    ) : (
                      <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.id.startsWith("streaming-") && isStreaming && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 bg-brand-500 animate-pulse rounded-sm align-text-bottom" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-1 mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline hover:no-underline" aria-label="Dismiss error">
            Dismiss
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={1}
          className="flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <Button type="button" size="sm" variant="secondary" onClick={handleStop}>
            Stop
          </Button>
        ) : (
          <Button type="submit" size="sm" disabled={!input.trim()}>
            Send
          </Button>
        )}
      </form>
    </div>
  );
}

