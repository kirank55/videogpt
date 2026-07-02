import type { VideoProject } from "@/lib/renderer";
import type { QualityResult } from "@/lib/renderer";

export interface VisualCheckIssue {
  severity: "warning" | "error";
  description: string;
}

export interface VisualFrameFeedback {
  actIndex: number;
  timestamp: number;
  score: number;
  feedback: string;
  issues: VisualCheckIssue[];
}

export interface VisualCheckResult {
  score: number;
  passed: boolean;
  summary: string;
  frames: VisualFrameFeedback[];
  recommendations: string[];
}

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  project?: VideoProject;
  brief?: any;
  /** Quality gate result from the server pipeline, if present. */
  diagnostics?: QualityResult;
  rawBrief?: any;
  isError?: boolean;
  visualCheck?: VisualCheckResult;
  visualCheckLoading?: boolean;
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

