import type { Session } from "@/types/generate";
import { bigDemoProject } from "@/app/demo/bigDemoProject";
import { blueprintProject } from "@/app/demo/blueprintProject";
import { hybridProject } from "@/app/demo/hybridProject";

export const initialSessions: Session[] = [
  {
    id: "launch-loop",
    name: "Launch Loop Teaser",
    updatedAt: "Edited May 8, 2026",
    project: bigDemoProject,
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "Create a fast product teaser with fluid arcs and ambient particles.",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "Original — fluid arcs, gradient fills, ambient particles.",
        project: bigDemoProject,
      },
    ],
  },
  {
    id: "founder-cut",
    name: "Founder Story Cutdown",
    updatedAt: "Edited May 6, 2026",
    project: blueprintProject,
    messages: [
      {
        id: "msg-3",
        role: "user",
        content: "Draw a strict blueprint animation.",
      },
      {
        id: "msg-4",
        role: "assistant",
        content: "Blueprint — technical schematic, cyan grid, strict horizontal packet flow.",
        project: blueprintProject,
      },
    ],
  },
  {
    id: "product-reel",
    name: "Product Reel V2",
    updatedAt: "Edited May 4, 2026",
    project: hybridProject,
    messages: [
      {
        id: "msg-5",
        role: "user",
        content: "Create a hybrid concept combining isometric titles and brutalist stacks.",
      },
      {
        id: "msg-6",
        role: "assistant",
        content: "Hybrid — Iso Title · Brutalist Stacks · Blueprint Animation · BigDemo Flow.",
        project: hybridProject,
      },
    ],
  },
];
