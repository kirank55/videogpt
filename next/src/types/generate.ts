import type { VideoProject } from "@/lib/ui/renderer";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  project?: VideoProject;
  isError?: boolean;
  /** Epoch ms when the message was created; older persisted sessions may omit this. */
  createdAt?: number;
};

export type Session = {
  id: string;
  name: string;
  duration: number;
  messages: ChatMessage[];
  project?: VideoProject;
  updatedAt: string;
};

