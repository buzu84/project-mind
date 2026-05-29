"use client";

import { useRef, useEffect } from "react";
import { ChatShell, type ChatMessage } from "@/components/chat-shell";
import { focusAfterPaint } from "@/lib/focus-utils";

const suggestions = [
  "What metrics should I track for my SaaS MVP?",
  "Help me write user stories for a checkout flow",
  "What's the best pricing strategy for a B2B product?",
  "How should I prioritize my product roadmap?",
];

interface GlobalChatClientProps {
  initialMessages: ChatMessage[];
}

export function GlobalChatClient({ initialMessages }: GlobalChatClientProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    focusAfterPaint(() => headingRef.current);
  }, []);

  return (
    <>
      <h1 ref={headingRef} tabIndex={-1} className="sr-only focus:outline-none">
        AI Assistant
      </h1>
      <ChatShell
      initialMessages={initialMessages}
      apiEndpoint="/api/ai/global-chat"
      buildRequestBody={(message) => ({ message })}
      suggestions={suggestions}
      emptyTitle="Chat with ProductMind AI"
      emptyDescription="Ask anything about product strategy, features, market analysis, or product decisions. For project-specific advice, open a project's AI Chat."
      placeholder="Ask anything about product management…"
    />
    </>
  );
}
