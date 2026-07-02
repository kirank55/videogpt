"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/generate/MessageBubble";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/types/generate";

function GeneratingPlaceholder() {
  const tokenCount = useStore((s) => s.streamingTokenCount);
  const charCount  = useStore((s) => s.streamingCharCount);
  const isStreaming = charCount > 0;

  // Animated progress bar — oscillates while streaming
  const barWidthPct = isStreaming
    ? Math.min(95, 20 + (charCount / 80)) // grows with char count, caps at 95%
    : 0;

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex items-center gap-3">
        <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary/35 border-t-primary" />
        <span className="font-semibold text-foreground">
          {isStreaming ? "Generating…" : "Connecting to model…"}
        </span>
        {isStreaming && (
          <span className="ml-auto text-[11px] font-mono text-primary tabular-nums">
            ~{tokenCount.toLocaleString()} tokens
          </span>
        )}
      </div>

      {/* Live progress bar */}
      <div className="w-full h-1 rounded-full bg-border/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: isStreaming ? `${barWidthPct}%` : "12%",
                   animation: isStreaming ? "none" : "pulse 1.5s ease-in-out infinite" }}
        />
      </div>

      {/* Rolling token preview */}
      {isStreaming && (
        <p className="text-[10px] font-mono text-muted-foreground/50 truncate">
          {charCount.toLocaleString()} chars received
        </p>
      )}
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
