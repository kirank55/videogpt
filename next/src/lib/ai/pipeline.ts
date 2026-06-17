// ── AI Pipeline ───────────────────────────────────────────────────────────────
//
// Orchestrates the full path from user prompt → VideoBrief → VideoProject.
//
//   runGeneratePipeline(prompt, duration)
//     → callOpenRouter → validateBrief → buildProjectFromBrief → validateProject
//     → { project, brief, diagnostics }
//
//   runModifyPipeline(currentBrief, instruction, duration)
//     → callOpenRouter(modifyPrompt) → validateBrief → buildProjectFromBrief → validateProject
//     → { project, brief, diagnostics }
//
// Both functions catch LLM/network errors and surface them in diagnostics rather
// than throwing, so the API routes can always return a 200 with structured error
// info.  The caller inspects `diagnostics.llmError` to check for failures.

import { callOpenRouter }        from "@/lib/ai/openrouter";
import { buildSystemPrompt, buildModifyPrompt } from "@/lib/ai/prompts";
import { validateBrief }         from "@/lib/brief/validateBrief";
import { buildProjectFromBrief, hydrateBrief } from "@/lib/brief/buildProjectFromBrief";
import { validateProject, runQualityGate } from "@/lib/renderer";
import type { QualityResult }    from "@/lib/renderer";
import type { VideoBrief, SupportedDuration } from "@/lib/schemas/brief";
import type { VideoProject }     from "@/lib/renderer";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface PipelineDiagnostics {
  /** Phase tag for debugging (always "6b-llm" in this file). */
  phase: string;
  /** Issues from validateProject() on the expanded VideoProject. */
  issues: ReturnType<typeof validateProject>;
  errorCount:   number;
  warningCount: number;
  /** Full quality gate result (score, passed, all issues). */
  qualityResult: QualityResult;
  /** Set if the LLM call failed.  Project will be a deterministic fallback. */
  llmError?: string;
  /** Raw value returned by OpenRouter, before validateBrief normalises it. */
  rawBrief?: unknown;
}

export interface PipelineResult {
  project:     VideoProject;
  brief:       VideoBrief;
  diagnostics: PipelineDiagnostics;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function qualityDiagnostics(
  project: VideoProject,
  extras: Partial<PipelineDiagnostics> = {},
): PipelineDiagnostics {
  const qualityResult = runQualityGate(project);
  const issues       = validateProject(project);
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

// ── runGeneratePipeline ───────────────────────────────────────────────────────

/**
 * Full generate pipeline: user prompt → LLM → VideoBrief → VideoProject.
 *
 * Never throws.  On LLM failure, returns a fallback project with
 * `diagnostics.llmError` set.
 */
export async function runGeneratePipeline(
  userPrompt: string,
  duration: SupportedDuration,
): Promise<PipelineResult> {
  const systemPrompt = buildSystemPrompt(duration);

  let rawBrief: unknown;
  try {
    rawBrief = await callOpenRouter(
      systemPrompt,
      userPrompt,
    );
  } catch (err) {
    const llmError = err instanceof Error ? err.message : String(err);
    const brief    = fallbackBrief(userPrompt.slice(0, 60) || "Untitled");
    const project  = buildProjectFromBrief(brief, duration);
    return { project, brief, diagnostics: qualityDiagnostics(project, { llmError, rawBrief }) };
  }

  const brief   = hydrateBrief(validateBrief(rawBrief));
  const project = buildProjectFromBrief(brief, duration);
  return { project, brief, diagnostics: qualityDiagnostics(project, { rawBrief }) };
}

// ── runModifyPipeline ─────────────────────────────────────────────────────────

/**
 * Modify pipeline: sends the current brief + user instruction to the LLM,
 * gets back an updated brief, re-expands into a VideoProject.
 *
 * Never throws.  On LLM failure, re-expands the *current* brief unchanged.
 */
export async function runModifyPipeline(
  currentBrief: VideoBrief,
  instruction: string,
  duration: SupportedDuration,
): Promise<PipelineResult> {
  const systemPrompt = buildSystemPrompt(duration);
  const userPrompt   = buildModifyPrompt(currentBrief, instruction);

  let rawBrief: unknown;
  try {
    rawBrief = await callOpenRouter(
      systemPrompt,
      userPrompt,
    );
  } catch (err) {
    // On failure: preserve the current brief, just re-expand it
    const llmError = err instanceof Error ? err.message : String(err);
    const project  = buildProjectFromBrief(currentBrief, duration);
    return {
      project,
      brief: currentBrief,
      diagnostics: qualityDiagnostics(project, { llmError, rawBrief }),
    };
  }

  const brief   = hydrateBrief(validateBrief(rawBrief));
  const project = buildProjectFromBrief(brief, duration);
  return { project, brief, diagnostics: qualityDiagnostics(project, { rawBrief }) };
}
