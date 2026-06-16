import type { VideoProject } from "@/lib/renderer";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  project?: VideoProject;
};

export type Session = {
  id: string;
  name: string;
  messages: ChatMessage[];
  project?: VideoProject;
  brief?: unknown; // Used in Phase 6+
  updatedAt: string;
};
