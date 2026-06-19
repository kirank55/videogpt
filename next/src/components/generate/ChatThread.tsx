"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "@/components/generate/MessageBubble";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/types/generate";

function GeneratingPlaceholder() {
  const [statusIdx, setStatusIdx] = useState(0);
  const statuses = [
    "Sending request to server...",
    "Generating video script...",
    "Building scene timeline...",
    "Rendering visual elements...",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIdx((prev) => {
        if (prev < statuses.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="size-4 animate-spin rounded-full border-2 border-primary/35 border-t-primary" />
      <span className="font-semibold text-foreground">{statuses[statusIdx]}</span>
    </div>
  );
}

const defaultMessages: ChatMessage[] = [
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
      <div className="border-b border-border px-5 py-4">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Chat thread
        </p>
      </div>
      <div className="space-y-4 px-5 py-5">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            project={message.project}
            diagnostics={message.diagnostics}
            sessionId={activeSessionId || undefined}
            messageId={message.id}
            isError={message.isError}
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
          <MessageBubble role="assistant" isLoading={true}>
            <GeneratingPlaceholder />
          </MessageBubble>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

type ChatThreadProps = {
  messages?: ChatMessage[];
};
