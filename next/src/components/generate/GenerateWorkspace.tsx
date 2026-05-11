"use client";

import { useState } from "react";
import {
  ChatThread,
  type ChatMessage,
} from "@/components/generate/ChatThread";
import { demoProject } from "@/app/demo/demoProject";
import { PromptForm } from "@/components/generate/PromptForm";
import { TopBar } from "@/components/layout/TopBar";
import { bigDemoProject } from "@/app/demo/bigDemoProject";

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Welcome back. Describe the video beat you want to build and I will sketch the first scene plan.",
  },
  {
    id: "brief",
    role: "user",
    content:
      "Create a fast product teaser with bold headlines, a dark backdrop, and animated feature callouts.",
  },
  {
    id: "reply",
    role: "assistant",
    content:
      "Great direction. I would start with a dramatic title card, then cut into three feature moments with short punchy captions.",
    project: bigDemoProject,
  },
];

export function GenerateWorkspace() {
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (prompt: string) => {
    console.log("Prompt submitted:", prompt);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
    };

    setMessages((current) => [...current, userMessage]);
    setIsLoading(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            "Nice. I would turn that into a quick opening hook, a paced middle sequence, and a final branded close.",
          project: demoProject,
        },
      ]);
      setIsLoading(false);
    }, 700);
  };

  return (
    <>
      <TopBar
        title="Generate"
        actions={
          <button
            type="button"
            className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Prompt Guide
          </button>
        }
      />
      <main className="mt-6 flex flex-1 flex-col">
        <ChatThread messages={messages} />
        <PromptForm isLoading={isLoading} onSubmit={handleSubmit} />
      </main>
    </>
  );
}
