"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/generate/MessageBubble";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/types/generate";

type ChatThreadProps = {
  messages?: ChatMessage[];
};

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

  useEffect(() => {
    // Scroll the parent container down when messages are added
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

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
        <div ref={endRef} />
      </div>
    </div>
  );
}
