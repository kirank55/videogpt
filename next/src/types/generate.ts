import type { VideoProject } from "@/lib/ui/renderer";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  project?: VideoProject;
  brief?: any;
  rawBrief?: any;
  isError?: boolean;
  /** Epoch ms when the message was created; older persisted sessions may omit this. */
  createdAt?: number;
};

export type Session = {
  id: string;
  name: string;
  messages: ChatMessage[];
  project?: VideoProject;
  brief?: unknown;
  updatedAt: string;
};

