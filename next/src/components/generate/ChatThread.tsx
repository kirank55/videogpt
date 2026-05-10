"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/generate/MessageBubble";
import type { VideoProject } from "@/lib/renderer";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  project?: VideoProject;
};

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
  {
    id: "user-brief",
    role: "user",
    content:
      "Create a fast product teaser with bold headlines, a dark backdrop, and animated feature callouts.",
  },
  {
    id: "assistant-plan",
    role: "assistant",
    content:
      "Great direction. I would start with a dramatic title card, then cut into three feature moments with short punchy captions.",
  },
];

export function ChatThread({ messages = defaultMessages }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="card flex min-h-96 flex-1 flex-col overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Chat thread
        </p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            project={message.project}
          >
            {message.content}
          </MessageBubble>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
