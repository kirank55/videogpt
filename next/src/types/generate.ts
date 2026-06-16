import type { VideoProject } from "@/lib/renderer";
import type { QualityResult } from "@/lib/renderer";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  project?: VideoProject;
  /** Quality gate result from the server pipeline, if present. */
  diagnostics?: QualityResult;
};

export type Session = {
  id: string;
  name: string;
  messages: ChatMessage[];
  project?: VideoProject;
  brief?: unknown; // Used in Phase 6+
  updatedAt: string;
};
