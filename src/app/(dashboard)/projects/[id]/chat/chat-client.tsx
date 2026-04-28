"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { IconSparkles, IconUser } from "@/components/icons";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

interface ChatClientProps {
  projectId: string;
  projectName: string;
  initialMessages: ChatMessage[];
}

const suggestions = [
  "What should our go-to-market strategy look like?",
  "Help me identify the biggest risks for this product",
  "What metrics should I track post-launch?",
  "Suggest a prioritization framework for our roadmap",
];

export function ChatClient({ projectId, projectName, initialMessages }: ChatClientProps) {
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
      id: `temp-${Date.now()}`,
      role: "user",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    // Add user message + empty assistant placeholder
    const assistantPlaceholderId = `streaming-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantPlaceholderId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      },
    ]);
    setInput("");
    setIsStreaming(true);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, message: content.trim() }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to get a response.");
        // Remove the empty assistant placeholder
        setMessages((prev) => prev.filter((m) => m.id !== assistantPlaceholderId));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Failed to read stream.");
        setMessages((prev) => prev.filter((m) => m.id !== assistantPlaceholderId));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6);
          try {
            const parsed = JSON.parse(payload) as
              | string
              | { done: true; id: string; createdAt: string }
              | { error: string };

            if (typeof parsed === "string") {
              // Token delta — append to the streaming message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantPlaceholderId
                    ? { ...m, content: m.content + parsed }
                    : m,
                ),
              );
              scrollToBottom();
            } else if ("done" in parsed && parsed.done) {
              // Stream complete — update placeholder with real ID
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantPlaceholderId
                    ? { ...m, id: parsed.id, createdAt: parsed.createdAt }
                    : m,
                ),
              );
            } else if ("error" in parsed) {
              setError(parsed.error);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — keep partial content
      } else {
        setError("Network error. Please check your connection and try again.");
        setMessages((prev) => prev.filter((m) => m.id !== assistantPlaceholderId));
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
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-1">
        {visibleMessages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
              <IconSparkles className="h-7 w-7 text-brand-600" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">
              Chat with ProductMind AI
            </h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Ask anything about <strong>{projectName}</strong> — strategy, features, market analysis, or product decisions.
            </p>
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
                    {!msg.id.startsWith("streaming-") && !msg.id.startsWith("temp-") && (
                      <span className="text-xs text-gray-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm leading-relaxed text-gray-600 whitespace-pre-wrap break-words">
                    {msg.content}
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
        <div className="mx-1 mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium underline hover:no-underline"
          >
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
          placeholder={`Ask about ${projectName}…`}
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

