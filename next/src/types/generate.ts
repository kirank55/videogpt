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

export type GenerationPart = "bookends" | "summary" | "main-diagram";

export type GenerationPartProgress = {
  status: "waiting" | "streaming" | "complete";
  characterCount: number;
  estimatedTokens: number;
  completionTokens?: number;
};

export type GenerationOperation = {
  requestId: string;
  status: "connecting" | "generating" | "composing" | "succeeded" | "failed" | "cancelled";
  parts: Record<GenerationPart, GenerationPartProgress>;
  characterCount: number;
  estimatedTokens: number;
  completionTokens?: number;
  error?: string;
};

