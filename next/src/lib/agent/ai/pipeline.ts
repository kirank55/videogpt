// ── AI Pipeline ───────────────────────────────────────────────────────────────
//
// Orchestrates the full path from user prompt → LLM response → VideoProject.
// Owns both the non-streaming and streaming intake so every API route (generate,
// modify, generate/stream, modify/stream) is a shallow HTTP adapter over one seam.
//
//   runGeneratePipeline(prompt, duration, opts?)
//       → buildSystemPrompt → callOpenRouter(Stream) → expandResponse
//
//   runModifyPipeline(currentBrief, instruction, duration, opts?)
//       → buildModifyPrompt → callOpenRouter(Stream) → expandResponse
//
// When opts.onEvent is provided, the pipeline emits phase events at each
// boundary (prompt-built → calling-openrouter → streaming → expanding) so the
// caller can show live progress. Absent ⇒ non-streaming, no events.
//
// The shared tail (expandResponse) lives in one place: it parses the LLM
// envelope, hydrates creative defaults, and expands into a VideoProject. This
// cannot drift between streaming and non-streaming routes.
//
// Never throws. LLM/intake failures are captured as diagnostics.llmError with a
// deterministic fallback project (generate) or the unchanged current brief (modify).

import { callOpenRouter, callOpenRouterStream, type Usage } from "@/lib/agent/ai/openrouter";
import { buildSystemPrompt, buildModifyPrompt, buildPrimitiveRetryPrompt } from "@/lib/agent/ai/prompts";
import { parseLLMResponse, type LLMResponse } from "@/lib/agent/schemas/llmResponse";
import { validateBrief } from "@/lib/agent/brief/validateBrief";
import {
  analyzePrimitiveBrief,
  formatPrimitiveDiagnosticsForRetry,
  type PrimitiveDiagnostics,
} from "@/lib/agent/brief/primitiveDiagnostics";
import {
  buildProjectFromBriefWithDiagnostics,
  hydrateBrief,
  type BriefExpansionDiagnostics,
} from "@/lib/agent/brief/buildProjectFromBrief";
import {
  composeNarrativeBrief,
  type NarrativeCompositionDiagnostics,
} from "@/lib/agent/brief/narrativeComposer";
import type { VideoBrief, SupportedDuration } from "@/lib/agent/schemas/brief";
import type { VideoProject }     from "@/lib/ui/renderer";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface PipelineDiagnostics {
  /** Tag for debugging (always "6b-llm" in this file). */
  phase: string;
  /** Set if the LLM call failed.  Project will be a deterministic fallback. */
  llmError?: string;
  /** Raw value returned by OpenRouter, before parseLLMResponse normalises it. */
  rawBrief?: unknown;
  /** OpenRouter token usage for the call (when the provider returns it). */
  usage?: Usage;
  /** Developer-only deterministic layout decisions from brief expansion. */
  layout?: BriefExpansionDiagnostics["layout"];
  /** Developer-only storyboard drawing compiler diagnostics from brief expansion. */
  storyboard?: BriefExpansionDiagnostics["storyboard"];
  /** Developer-only structure normalization diagnostics. */
  narrative?: NarrativeCompositionDiagnostics;
  /** Developer-only primitive specificity and structural diagnostics. */
  primitive?: PrimitiveDiagnostics;
  /** True when the pipeline used its one primitive-improvement retry. */
  primitiveRetried?: boolean;
}

export interface PipelineResult {
  project:     VideoProject;
  brief:       VideoBrief;
  /** Short project name from the LLM envelope (falls back to brief.title). */
  projectName: string;
  /** 1–2 sentence summary from the LLM envelope (empty string if absent). */
  summary:     string;
  diagnostics: PipelineDiagnostics;
}

// ── Phase events ──────────────────────────────────────────────────────────────
//
// A single discriminated union replaces the old onChunk callback. The caller
// gets one stream of typed events it can pattern-match on for UI feedback.

export type PipelineEvent =
  | { type: "prompt-built" }
  | { type: "calling-openrouter" }
  | { type: "primitive-retry"; score: number }
  | { type: "streaming"; tokenCount: number; charCount: number }
  | { type: "expanding" };

export interface PipelineOptions {
  /**
   * When provided, the LLM is called in streaming mode and onEvent fires at
   * each pipeline boundary. Absent ⇒ non-streaming call, no events. The
   * streaming decision is an implementation detail of this module.
   */
  onEvent?: (event: PipelineEvent) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal fallback brief used when the LLM call completely fails. */
function fallbackBrief(title: string): VideoBrief {
  return validateBrief({
    title,
    subtitle: "AI generation unavailable - using fallback scene",
    closingLine: "Try again or check your API key.",
    palette: "midnight",
    style: "modern",
    scenes: [
      {
        heading: "Fallback Scene",
        diagramLayout: "pipeline",
        blocks: [
          { heading: "Generation failed", description: "The AI service could not be reached." },
          { heading: "What to do", description: "Check OPENROUTER_API_KEY in .env.local and try again." },
        ],
        graph: {
          nodes: [
            { id: "request", label: "Prompt", icon: "browser" },
            { id: "service", label: "AI service", icon: "cloud" },
            { id: "fallback", label: "Fallback", icon: "shield" },
          ],
          edges: [
            { from: "request", to: "service", label: "call", animated: true },
            { from: "service", to: "fallback", label: "recover", animated: true },
          ],
        },
        entryAnimation: "slide-up",
        blockStyle: "cards",
        transition: "fade",
      },
    ],
  });
}

/**
 * Shared intake tail: parse the LLM response envelope, hydrate creative
 * defaults, and expand into a VideoProject. One function — not separate
 * validate/hydrate/build steps — so the brief→project expansion cannot drift.
 */
function expandParsedResponse(
  response: LLMResponse,
  duration: SupportedDuration,
  userPrompt: string,
  extras: Partial<PipelineDiagnostics> = {},
): { response: LLMResponse; project: VideoProject; diagnostics: PipelineDiagnostics } {
  const hydrated = hydrateBrief(response.brief);
  const composed = composeNarrativeBrief(hydrated, { userPrompt });
  const brief    = composed.brief;
  const expanded = buildProjectFromBriefWithDiagnostics(brief, duration);
  const project  = expanded.project;
  project.name   = response.projectName;
  return {
    response: { ...response, brief },
    project,
    diagnostics: {
      phase: "6b-llm",
      layout: expanded.diagnostics.layout,
      storyboard: expanded.diagnostics.storyboard,
      narrative: composed.diagnostics,
      ...extras,
    },
  };
}

/**
 * Deep intake implementation behind the two public functions.
 *
 * Calls the LLM (streaming iff onEvent is provided), emits phase events at each
 * boundary, runs the shared tail, and captures any failure as
 * diagnostics.llmError using the caller-supplied fallback. Never throws.
 */
async function runIntake(
  systemPrompt: string,
  userPrompt: string,
  duration: SupportedDuration,
  opts: PipelineOptions,
  onFallback: () => {
    brief: VideoBrief;
    project: VideoProject;
    projectName?: string;
    summary?: string;
    layout?: BriefExpansionDiagnostics["layout"];
    storyboard?: BriefExpansionDiagnostics["storyboard"];
  },
): Promise<PipelineResult> {
  const emit = opts.onEvent ?? (() => {});

  try {
    emit({ type: "prompt-built" });
    emit({ type: "calling-openrouter" });

    let usage: Usage | undefined;
    const onUsage = (u: Usage) => { usage = u; };

    const callModel = async (prompt: string): Promise<unknown> => {
      if (!opts.onEvent) {
        return callOpenRouter(systemPrompt, prompt, { onUsage });
      }
      return callOpenRouterStream(systemPrompt, prompt, {
        onChunk: (_delta, accumulated) => {
          emit({
            type: "streaming",
            tokenCount: Math.round(accumulated.length / 4),
            charCount: accumulated.length,
          });
        },
        onUsage,
      });
    };

    let raw = await callModel(userPrompt);
    let response = parseLLMResponse(raw);
    let primitive = analyzePrimitiveBrief(response.brief, { userPrompt });
    let primitiveRetried = false;

    if (primitive.shouldRetry) {
      primitiveRetried = true;
      emit({ type: "primitive-retry", score: primitive.score });
      raw = await callModel(buildPrimitiveRetryPrompt(
        userPrompt,
        formatPrimitiveDiagnosticsForRetry(primitive),
      ));
      response = parseLLMResponse(raw);
      primitive = analyzePrimitiveBrief(response.brief, { userPrompt });
    }

    emit({ type: "expanding" });
    const { response: expandedResponse, project, diagnostics } = expandParsedResponse(response, duration, userPrompt, {
      rawBrief: raw,
      usage,
      primitive,
      primitiveRetried,
    });
    return {
      project,
      brief:       expandedResponse.brief,
      projectName: expandedResponse.projectName,
      summary:     expandedResponse.summary,
      diagnostics,
    };
  } catch (err) {
    const llmError = err instanceof Error ? err.message : String(err);
    const { brief, project, projectName, summary, layout, storyboard } = onFallback();
    return {
      project,
      brief,
      projectName: projectName ?? brief.title,
      summary:     summary ?? "",
      diagnostics: { phase: "6b-llm", llmError, layout, storyboard },
    };
  }
}

// ── runGeneratePipeline ───────────────────────────────────────────────────────

/**
 * Full generate pipeline: user prompt → LLM → VideoProject.
 *
 * Pass opts.onEvent to receive phase events for live progress; omit it for a
 * single-shot call. Never throws — on failure, returns a fallback project with
 * diagnostics.llmError set.
 */
export async function runGeneratePipeline(
  userPrompt: string,
  duration: SupportedDuration,
  opts: PipelineOptions = {},
): Promise<PipelineResult> {
  const systemPrompt = buildSystemPrompt(duration);
  return runIntake(systemPrompt, userPrompt, duration, opts, () => {
    const brief = fallbackBrief(userPrompt.slice(0, 60) || "Untitled");
    const expanded = buildProjectFromBriefWithDiagnostics(brief, duration);
    return {
      brief,
      project: expanded.project,
      layout: expanded.diagnostics.layout,
      storyboard: expanded.diagnostics.storyboard,
    };
  });
}

// ── runModifyPipeline ─────────────────────────────────────────────────────────

/**
 * Modify pipeline: sends the current brief + user instruction to the LLM,
 * gets back an updated brief, re-expands into a VideoProject.
 *
 * Pass opts.onEvent to receive phase events; omit it for a single-shot call.
 * Never throws — on failure, re-expands the current brief unchanged with
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
  return runIntake(systemPrompt, userPrompt, duration, opts, () => {
    const expanded = buildProjectFromBriefWithDiagnostics(currentBrief, duration);
    return {
      brief: currentBrief,
      project: expanded.project,
      layout: expanded.diagnostics.layout,
      storyboard: expanded.diagnostics.storyboard,
    };
  });
}
