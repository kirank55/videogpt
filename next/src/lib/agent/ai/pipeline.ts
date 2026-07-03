// ── AI Pipeline ───────────────────────────────────────────────────────────────
//
// Orchestrates the full path from user prompt → VideoBrief → VideoProject.
// Owns both the non-streaming and streaming intake so every API route (generate,
// modify, generate/stream, modify/stream) is a shallow HTTP adapter over one seam.
//
//   runGeneratePipeline(prompt, duration, opts?)
//       → buildSystemPrompt → (callOpenRouter | callOpenRouterStream)
//       → validateBrief → hydrateBrief → buildProjectFromBrief → qualityDiagnostics
//
//   runModifyPipeline(currentBrief, instruction, duration, opts?)
//       → buildModifyPrompt → (callOpenRouter | callOpenRouterStream)
//       → validateBrief → hydrateBrief → buildProjectFromBrief → qualityDiagnostics
//
// Streaming is selected by passing opts.onChunk — the stream/non-stream split is an
// implementation detail, not a separate interface. The shared tail (validate →
// hydrate → build → quality) lives in one place so it cannot drift between the
// streaming and non-streaming routes.
//
// Never throws. LLM/intake failures are captured as diagnostics.llmError with a
// deterministic fallback project (generate) or the unchanged current brief (modify).

import { callOpenRouter, callOpenRouterStream, type Usage } from "@/lib/agent/ai/openrouter";
import { buildSystemPrompt, buildModifyPrompt } from "@/lib/agent/ai/prompts";
import { validateBrief } from "@/lib/agent/brief/validateBrief";
import { buildProjectFromBrief, hydrateBrief } from "@/lib/agent/brief/buildProjectFromBrief";
import { runQualityGate, toValidationResults } from "@/lib/ui/renderer";
import type { QualityResult, ValidationResult } from "@/lib/ui/renderer";
import type { VideoBrief, SupportedDuration } from "@/lib/agent/schemas/brief";
import type { VideoProject }     from "@/lib/ui/renderer";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface PipelineDiagnostics {
  /** Tag for debugging (always "6b-llm" in this file). */
  phase: string;
  /** Issues from validateProject() on the expanded VideoProject. */
  issues: ValidationResult[];
  errorCount:   number;
  warningCount: number;
  /** Full quality gate result (score, passed, all issues). */
  qualityResult: QualityResult;
  /** Set if the LLM call failed.  Project will be a deterministic fallback. */
  llmError?: string;
  /** Raw value returned by OpenRouter, before validateBrief normalises it. */
  rawBrief?: unknown;
  /** OpenRouter token usage for the call (when the provider returns it). */
  usage?: Usage;
}

export interface PipelineResult {
  project:     VideoProject;
  brief:       VideoBrief;
  diagnostics: PipelineDiagnostics;
}

/** Streamed-token callback — same shape as callOpenRouterStream's onChunk. */
export type ChunkCallback = (delta: string, accumulated: string) => void;

export interface PipelineOptions {
  /**
   * When provided, the LLM is called in streaming mode and onChunk fires per
   * token delta. Absent ⇒ non-streaming call. The streaming decision is an
   * implementation detail of this module, not a separate interface.
   */
  onChunk?: ChunkCallback;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function qualityDiagnostics(
  project: VideoProject,
  extras: Partial<PipelineDiagnostics> = {},
): PipelineDiagnostics {
  // Run the quality gate once; derive the legacy ValidationResult[] from it
  // rather than calling validateProject (which would re-run the gate).
  const qualityResult = runQualityGate(project);
  const issues       = toValidationResults(qualityResult);
  const errorCount   = issues.filter((d) => d.severity === "error").length;
  const warningCount = issues.filter((d) => d.severity === "warning").length;
  return { phase: "6b-llm", issues, errorCount, warningCount, qualityResult, ...extras };
}

/** Minimal fallback brief used when the LLM call completely fails. */
function fallbackBrief(title: string): VideoBrief {
  return validateBrief({
    layout: "single-column",
    title,
    subtitle: "AI generation unavailable — using fallback layout",
    closingLine: "Try again or check your API key.",
    blocks: [
      { heading: "Generation failed",  description: "The AI service could not be reached." },
      { heading: "What to do",         description: "Check OPENROUTER_API_KEY in .env.local and try again." },
    ],
    palette: "midnight",
    style: "modern",
  });
}

/**
 * Shared intake tail: validate the raw LLM output, hydrate creative defaults,
 * expand into a VideoProject, and run the quality gate. Both the streaming and
 * non-streaming paths funnel through here so the brief→project expansion cannot
 * drift between them.
 */
function expandAndValidate(
  rawBrief: unknown,
  duration: SupportedDuration,
  extras: Partial<PipelineDiagnostics> = {},
): { brief: VideoBrief; project: VideoProject; diagnostics: PipelineDiagnostics } {
  const brief   = hydrateBrief(validateBrief(rawBrief));
  const project = buildProjectFromBrief(brief, duration);
  return { brief, project, diagnostics: qualityDiagnostics(project, extras) };
}

/**
 * Deep intake implementation behind the two public functions.
 *
 * Calls the LLM (streaming iff onChunk is provided), runs the shared tail, and
 * captures any failure as diagnostics.llmError using the caller-supplied
 * fallback (a fresh fallback brief for generate; the unchanged current brief
 * for modify). Never throws.
 */
async function runIntake(
  systemPrompt: string,
  userPrompt: string,
  duration: SupportedDuration,
  opts: PipelineOptions,
  onFallback: () => { brief: VideoBrief; project: VideoProject },
): Promise<PipelineResult> {
  try {
    let usage: Usage | undefined;
    const onUsage = (u: Usage) => { usage = u; };
    const rawBrief = opts.onChunk
      ? await callOpenRouterStream(systemPrompt, userPrompt, { onChunk: opts.onChunk, onUsage })
      : await callOpenRouter(systemPrompt, userPrompt, { onUsage });
    return expandAndValidate(rawBrief, duration, { rawBrief, usage });
  } catch (err) {
    const llmError = err instanceof Error ? err.message : String(err);
    const { brief, project } = onFallback();
    return { project, brief, diagnostics: qualityDiagnostics(project, { llmError }) };
  }
}

// ── runGeneratePipeline ───────────────────────────────────────────────────────

/**
 * Full generate pipeline: user prompt → LLM → VideoBrief → VideoProject.
 *
 * Pass opts.onChunk to stream tokens; omit it for a single-shot call. Never
 * throws — on failure, returns a fallback project with diagnostics.llmError set.
 */
export async function runGeneratePipeline(
  userPrompt: string,
  duration: SupportedDuration,
  opts: PipelineOptions = {},
): Promise<PipelineResult> {
  const systemPrompt = buildSystemPrompt(duration);
  return runIntake(systemPrompt, userPrompt, duration, opts, () => {
    const brief = fallbackBrief(userPrompt.slice(0, 60) || "Untitled");
    return { brief, project: buildProjectFromBrief(brief, duration) };
  });
}

// ── runModifyPipeline ─────────────────────────────────────────────────────────

/**
 * Modify pipeline: sends the current brief + user instruction to the LLM,
 * gets back an updated brief, re-expands into a VideoProject.
 *
 * Pass opts.onChunk to stream tokens; omit it for a single-shot call. Never
 * throws — on failure, re-expands the current brief unchanged with
 * diagnostics.llmError set.
 */
export async function runModifyPipeline(
  currentBrief: VideoBrief,
  instruction: string,
  duration: SupportedDuration,
  opts: PipelineOptions = {},
): Promise<PipelineResult> {
  const systemPrompt = buildSystemPrompt(duration);
  const userPrompt   = buildModifyPrompt(currentBrief, instruction);
  return runIntake(systemPrompt, userPrompt, duration, opts, () => ({
    brief: currentBrief,
    project: buildProjectFromBrief(currentBrief, duration),
  }));
}
