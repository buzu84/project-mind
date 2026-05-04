"use client";

import { ChatShell, type ChatMessage } from "@/components/chat-shell";

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
  return (
    <ChatShell
      initialMessages={initialMessages}
      apiEndpoint="/api/ai/chat"
      buildRequestBody={(message) => ({ message, projectId })}
      suggestions={suggestions}
      emptyTitle="Chat with ProductMind AI"
      emptyDescription={`Ask questions about ${projectName}. The AI uses your project context, feedback documents, and research to provide tailored advice.`}
      placeholder={`Ask about ${projectName}…`}
      contextBanner={
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-700">
          <span>🔒</span>
          <span>Using context from <strong>{projectName}</strong> — project details, feedback documents, and research are included in every response.</span>
        </div>
      }
    />
  );
}
