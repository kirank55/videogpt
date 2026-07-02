"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/generate/MessageBubble";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/types/generate";

export const defaultMessages: ChatMessage[] = [
  {
    id: "intro",
    role: "assistant",
    content:
      "Welcome back. Describe the video beat you want to build and I will sketch the first scene plan.",
  },
];

export function ChatThread({ messages = defaultMessages }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const retryPrompt = useStore((s) => s.retryPrompt);
  const isLoading = useStore((s) => s.isLoading);

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
            sessionId={activeSessionId || undefined}
            messageId={message.id}
            isError={message.isError}
            createdAt={message.createdAt}
            onRetry={
              activeSessionId && message.isError
                ? () => retryPrompt(activeSessionId)
                : undefined
            }
          >
            {message.content}
          </MessageBubble>
        ))}
        {isLoading && (
          <MessageBubble role="assistant" isLoading={true} />
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

type ChatThreadProps = {
  messages?: ChatMessage[];
};