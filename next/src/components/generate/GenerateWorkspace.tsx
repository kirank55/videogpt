"use client";

import { useState } from "react";
import {
  ChatThread,
  type ChatMessage,
} from "@/components/generate/ChatThread";
import { PromptForm } from "@/components/generate/PromptForm";
import { TopBar } from "@/components/layout/TopBar";
import { bigDemoProject } from "@/app/demo/bigDemoProject";
import { blueprintProject } from "@/app/demo/blueprintProject";
import { neonPulseProject } from "@/app/demo/neonPulseProject";
import { whiteboardProject } from "@/app/demo/whiteboardProject";
import { missionControlProject } from "@/app/demo/missionControlProject";
import { timelineProject } from "@/app/demo/timelineProject";
import { brutalistProject } from "@/app/demo/brutalistProject";
import { isometricProject } from "@/app/demo/isometricProject";
import { hybridProject } from "@/app/demo/hybridProject";

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Here are 7 demo projects showcasing different visual styles. Each one uses the same client–server architecture concept rendered with a distinct aesthetic.",
  },
  {
    id: "demo-original",
    role: "assistant",
    content: "1 · Original — fluid arcs, gradient fills, ambient particles.",
    project: bigDemoProject,
  },
  {
    id: "demo-blueprint",
    role: "assistant",
    content: "2 · Blueprint — technical schematic, cyan grid, strict horizontal packet flow.",
    project: blueprintProject,
  },
  {
    id: "demo-neon",
    role: "assistant",
    content: "3 · Neon Pulse — cyberpunk, hot-pink + electric-cyan, ghost trails, laser sweeps.",
    project: neonPulseProject,
  },
  {
    id: "demo-whiteboard",
    role: "assistant",
    content: "4 · Whiteboard — warm off-white, hand-drawn feel, dark charcoal strokes, slow pacing.",
    project: whiteboardProject,
  },
  {
    id: "demo-mission",
    role: "assistant",
    content: "5 · Mission Control — HUD dashboard, full-width bands, packet travels vertically through layers.",
    project: missionControlProject,
  },
  {
    id: "demo-timeline",
    role: "assistant",
    content: "6 · Timeline — filmstrip with playhead, events pop above/below with timestamps.",
    project: timelineProject,
  },
  {
    id: "demo-brutalist",
    role: "assistant",
    content: "7 · Brutalist — pure black, hard snap transitions, zero easing, single red accent.",
    project: brutalistProject,
  },
  {
    id: "demo-isometric",
    role: "assistant",
    content: "8 · Isometric 3D — depth-card illusion, diagonal offset shadows, iso-angle packet arc.",
    project: isometricProject,
  },
  {
    id: "demo-hybrid",
    role: "assistant",
    content: "9 · Hybrid — Iso Title · Brutalist Stacks · Blueprint Animation · BigDemo Flow.",
    project: hybridProject,
  },
];

export function GenerateWorkspace() {
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (prompt: string) => {
    console.log("Prompt submitted:", prompt);

    // const userMessage: ChatMessage = {
    //   id: `user-${Date.now()}`,
    //   role: "user",
    //   content: prompt,
    // };

    // setMessages((current) => [...current, userMessage]);
    // setIsLoading(true);

    // window.setTimeout(() => {
    //   setMessages((current) => [
    //     ...current,
    //     {
    //       id: `assistant-${Date.now()}`,
    //       role: "assistant",
    //       content:
    //         "Nice. I would turn that into a quick opening hook, a paced middle sequence, and a final branded close.",
    //       project: demoProject,
    //     },
    //   ]);
    //   setIsLoading(false);
    // }, 700);
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
