import type { VideoPartKind } from "@/lib/agent/rootGeneration/schemas";

export type VideoPartBudget = {
  maxTokens: number;
  maxEvents?: number;
};

export const BOOKENDS_MAX_TOKENS = 384;

/** Bounds model work to the amount of video the section can actually display. */
export function getVideoPartBudget(part: VideoPartKind, duration: number): VideoPartBudget {
  if (part === "title") return { maxTokens: 384 };
  if (part === "conclusion") return { maxTokens: 256 };
  if (part === "summary") return { maxTokens: 2_048, maxEvents: 10 };
  if (duration <= 4) return { maxTokens: 4_096, maxEvents: 14 };
  if (duration <= 10) return { maxTokens: 6_144, maxEvents: 20 };
  return { maxTokens: 8_192, maxEvents: 28 };
}


