// ── LLM Response Envelope ─────────────────────────────────────────────────────
//
// The LLM returns a JSON envelope — not a bare VideoBrief — so it can carry
// metadata the server needs without re-deriving it from the brief.
//
//   { projectName: string, summary: string, brief: VideoBrief }
//
// parseLLMResponse(raw) accepts **any** unknown value and always returns a
// valid { projectName, summary, brief } triple. Never throws.
//
// Backward compatibility: if the LLM returns a bare VideoBrief (no `brief`
// wrapper), the whole object is treated as the brief and projectName/summary
// fall back to safe defaults.

import { z } from "zod";
import { validateBrief } from "@/lib/agent/brief/validateBrief";
import type { VideoBrief } from "@/lib/agent/schemas/brief";

export interface LLMResponse {
  /** Short, human-readable project name (falls back to brief.title). */
  projectName: string;
  /** 1–2 sentence summary shown in the chat UI (falls back to ""). */
  summary: string;
  /** Validated, normalized VideoBrief. */
  brief: VideoBrief;
}

// ── Lenient parse ─────────────────────────────────────────────────────────────

const LenientEnvelopeSchema = z.object({
  projectName: z.string().min(1).catch(""),
  summary: z.string().catch(""),
  brief: z.unknown().optional(),
}).catch({ projectName: "", summary: "" });

/**
 * Deterministic parser for the LLM response envelope.
 * Accepts **any** unknown value and always returns a valid LLMResponse.
 *
 * - Bare VideoBrief (no `brief` key) → projectName/summary fall back to
 *   "" and the whole object is treated as the brief.
 * - Full envelope { projectName, summary, brief } → all fields extracted.
 * - Non-object input → safe defaults (untitled brief, empty summary).
 *
 * Never throws.
 */
export function parseLLMResponse(raw: unknown): LLMResponse {
  const obj =
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  // Detect envelope vs bare brief: if a `brief` key exists, treat as envelope.
  if ("brief" in obj && obj.brief !== null && typeof obj.brief === "object") {
    const parsed = LenientEnvelopeSchema.parse(obj);
    const brief = validateBrief(parsed.brief);
    return {
      projectName: parsed.projectName || brief.title,
      summary: parsed.summary,
      brief,
    };
  }

  // Bare brief — no envelope wrapper.
  const brief = validateBrief(raw);
  return {
    projectName: brief.title,
    summary: "",
    brief,
  };
}
