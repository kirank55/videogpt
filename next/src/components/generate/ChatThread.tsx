"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/generate/MessageBubble";
import { useStore } from "@/lib/ui/store";
import type { ChatMessage } from "@/types/generate";

export const defaultMessages: ChatMessage[] = [
  {
    id: "intro",
    role: "assistant",
    content:
      "Describe the animated explanation you want. I will generate coordinated bookends, a compact summary, and a deeper main diagram.",
  },
];

export function ChatThread({
  messages = defaultMessages,
  sessionId,
  isLoading = false,
}: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const retryPrompt = useStore((s) => s.retryPrompt);

  useEffect(() => {
    // Scroll the parent container down when messages are added or loading state changes
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  return (
    <div className="card flex flex-col">
      <div className="space-y-4 px-5 py-5">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            project={message.project}
            sessionId={sessionId}
            messageId={message.id}
            isError={message.isError}
            createdAt={message.createdAt}
            onRetry={
              sessionId && message.isError
                ? () => retryPrompt(sessionId)
                : undefined
            }
          >
            {message.content}
          </MessageBubble>
        ))}
        {isLoading && (
          <MessageBubble role="assistant" isLoading={true} sessionId={sessionId} />
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

type ChatThreadProps = {
  messages?: ChatMessage[];
  sessionId?: string;
  isLoading?: boolean;
};
