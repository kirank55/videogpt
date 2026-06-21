import { GenerateWorkspace } from "@/components/generate/GenerateWorkspace";
import type { ChatMessage } from "@/types/generate";
import { type VideoProject } from "@/lib/renderer";

const hybridProject: VideoProject = {
  id: "hybrid-demo-project",
  name: "Hybrid Demo",
  width: 1920,
  height: 1080,
  duration: 5,
  events: [
    {
      id: "bg",
      type: "background",
      start: 0,
      end: 5,
      layer: 1,
      background: {
        kind: "solid",
        color: "#0f172a",
      },
    },
    {
      id: "title",
      type: "text",
      start: 0,
      end: 5,
      layer: 2,
      text: "Hybrid Demo",
      x: 960,
      y: 540,
      maxWidth: 800,
      color: "#ffffff",
      fontSize: 64,
      align: "center",
      verticalAlign: "middle",
    },
  ],
};

const hybridMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Here is your generated hybrid project. Let me know if you'd like to adjust the visual style or make any content modifications.",
  },
  {
    id: "demo-hybrid",
    role: "assistant",
    content: "Hybrid — Iso Title · Brutalist Stacks · Blueprint Animation · BigDemo Flow.",
    project: hybridProject,
  },
];

export default function ChatPage() {
  return (
    <GenerateWorkspace
      initialMessages={hybridMessages}
      title="Chat"
      ignoreActiveSession={true}
    />
  );
}
