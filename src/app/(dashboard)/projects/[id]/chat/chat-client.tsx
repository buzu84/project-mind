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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, message: content.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to get a response. Please try again.");
        return;
      }

      const assistantMessage: ChatMessage = {
        id: data.id,
        role: "assistant",
        content: data.content,
        createdAt: data.createdAt,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
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

  const visibleMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-1">
        {visibleMessages.length === 0 && !isLoading && (
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
                    <IconSparkles className="h-4 w-4 text-brand-600" />
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
                    <span className="text-xs text-gray-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="mt-1 text-sm leading-relaxed text-gray-600 whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <IconSparkles className="h-4 w-4 text-brand-600 animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300" />
                </div>
              </div>
            )}

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
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim() || isLoading}
          isLoading={isLoading}
        >
          Send
        </Button>
      </form>
    </div>
  );
}

