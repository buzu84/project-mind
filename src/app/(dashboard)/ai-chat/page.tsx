"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconSparkles, IconUser } from "@/components/icons";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestions = [
  "What metrics should I track for my SaaS MVP?",
  "Help me write user stories for a checkout flow",
  "What's the best pricing strategy for a B2B product?",
  "How should I prioritize my product roadmap?",
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your AI product assistant. I can help you with product strategy, feature planning, market analysis, and more. What would you like to work on?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSuggestion(text: string) {
    setInput(text);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Placeholder: simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "This is a placeholder response. The AI chat feature will be connected to the OpenAI API in a future update. For now, you can use the AI tools within each project (PRD Generator, Feature Prioritizer, Competitive Analysis) for real AI-powered insights.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      {/* Chat messages */}
      <div className="flex-1 space-y-6 overflow-y-auto pb-4">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-3">
            {message.role === "assistant" ? (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <IconSparkles className="h-4 w-4 text-brand-600" />
              </div>
            ) : (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <IconUser className="h-4 w-4 text-gray-500" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {message.role === "assistant" ? "ProductMind AI" : "You"}
                </span>
                <span className="text-xs text-gray-400">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
              <IconSparkles className="h-4 w-4 text-brand-600 animate-pulse" />
            </div>
            <div className="flex items-center gap-1 pt-2">
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {suggestions.map((text) => (
            <button
              key={text}
              onClick={() => handleSuggestion(text)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              {text}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about product management…"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          disabled={isLoading}
        />
        <Button type="submit" size="sm" disabled={!input.trim() || isLoading}>
          Send
        </Button>
      </form>
    </div>
  );
}

