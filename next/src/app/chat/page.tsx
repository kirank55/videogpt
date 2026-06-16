import { GenerateWorkspace } from "@/components/generate/GenerateWorkspace";
import { hybridProject } from "@/app/demo/hybridProject";
import type { ChatMessage } from "@/types/generate";

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
