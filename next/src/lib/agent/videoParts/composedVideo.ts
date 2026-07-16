import { z } from "zod";
import { callOpenRouter, type OpenRouterOptions, type Usage } from "@/lib/agent/ai/openrouter";
import {
  generateVideoPart,
  type VideoPartModelCaller,
} from "@/lib/agent/videoParts/pipeline";
import { buildStandaloneVideoPartProject } from "@/lib/agent/videoParts/project";
import {
  buildBookendsSystemPrompt,
  buildVideoPartRepairPrompt,
} from "@/lib/agent/videoParts/prompts";
import {
  BookendsContentSchema,
  type BookendsContent,
  type MainDiagramPartContent,
  type SummaryPartContent,
} from "@/lib/agent/videoParts/schemas";
import { resolveVideoPartTheme } from "@/lib/agent/videoParts/theme";
import { DEFAULT_PALETTE, PALETTES } from "@/lib/others/catalog/palettes";
import type { SupportedDuration } from "@/lib/others/schemas/duration";
import { seededHash } from "@/lib/others/timeline/utils";
import type { AnimatedValue, TimelineEvent, VideoProject } from "@/lib/ui/renderer";

export type ComposedVideoModelCaller = VideoPartModelCaller;

export type GenerateComposedVideoRequest = {
  prompt: string;
  duration: SupportedDuration;
};

export type CompositionWindow = {
  start: number;
  end: number;
  duration: number;
};

export type CompositionWindows = {
  intro: CompositionWindow;
  summary: CompositionWindow;
  main: CompositionWindow;
  conclusion: CompositionWindow;
};

export type ComposedVideoResult = {
  project: VideoProject;
  projectName: string;
  summary: string;
  parts: {
    bookends: BookendsContent;
    summary: SummaryPartContent;
    mainDiagram: MainDiagramPartContent;
  };
};

export type ComposedVideoDependencies = {
  callModel: ComposedVideoModelCaller;
  onPhase?: (phase: "generating-sections" | "composing") => void;
  onModelProgress?: (
    part: "bookends" | "summary" | "main-diagram",
    progress: { characterCount: number },
  ) => void;
  onModelUsage?: (
    part: "bookends" | "summary" | "main-diagram",
    usage: Usage,
  ) => void;
  onModelComplete?: (part: "bookends" | "summary" | "main-diagram") => void;
  signal?: AbortSignal;
};

const DEFAULT_DEPENDENCIES: ComposedVideoDependencies = {
  callModel: callOpenRouter,
};

const BOOKEND_DURATION: Record<SupportedDuration, number> = {
  5: 0.85,
  10: 1.05,
  15: 1.35,
  20: 1.5,
};

const ANIMATED_FIELDS = [
  "opacity",
  "translateX",
  "translateY",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "drawProgress",
] as const;

export class ComposedVideoGenerationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ComposedVideoGenerationError";
  }
}

function roundTime(value: number): number {
  return Number(value.toFixed(3));
}

export function planCompositionWindows(duration: SupportedDuration): CompositionWindows {
  const bookend = BOOKEND_DURATION[duration];
  const contentDuration = duration - bookend * 2;
  const summaryDuration = roundTime(Math.min(4, Math.max(1, contentDuration * 0.3)));
  const summaryStart = bookend;
  const mainStart = roundTime(summaryStart + summaryDuration);
  const conclusionStart = roundTime(duration - bookend);
  return {
    intro: { start: 0, end: bookend, duration: bookend },
    summary: {
      start: summaryStart,
      end: mainStart,
      duration: summaryDuration,
    },
    main: {
      start: mainStart,
      end: conclusionStart,
      duration: roundTime(conclusionStart - mainStart),
    },
    conclusion: {
      start: conclusionStart,
      end: duration,
      duration: bookend,
    },
  };
}

function validationMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .slice(0, 8)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
  }
  return error instanceof Error ? error.message : String(error);
}

function serializeOutput(raw: unknown): string {
  try {
    return JSON.stringify(raw, null, 2) ?? String(raw);
  } catch {
    return String(raw);
  }
}

type RepairableModelOutputFailure = Error & {
  name: "OpenRouterJsonParseError" | "OpenRouterLengthError";
  content?: string;
};

function isRepairableModelOutputFailure(
  error: unknown,
): error is RepairableModelOutputFailure {
  return error instanceof Error
    && (error.name === "OpenRouterJsonParseError" || error.name === "OpenRouterLengthError");
}

async function generateBookends(
  request: GenerateComposedVideoRequest,
  visualContext: string,
  callModel: ComposedVideoModelCaller,
): Promise<BookendsContent> {
  const systemPrompt = buildBookendsSystemPrompt(request.duration, visualContext);
  const repair = async (firstError: unknown, previousOutput?: string) => {
    const repairPrompt = buildVideoPartRepairPrompt(
      request.prompt,
      validationMessage(firstError),
      previousOutput,
    );
    let repaired: unknown;
    try {
      repaired = await callModel(systemPrompt, repairPrompt, {
        maxTokens: 768,
        temperature: 0.2,
        reasoning: { enabled: false },
      });
    } catch (repairCallError) {
      if (!isRepairableModelOutputFailure(repairCallError)) throw repairCallError;
      throw new ComposedVideoGenerationError(
        `bookends remained invalid JSON after one repair attempt: ${validationMessage(repairCallError)}`,
        { cause: repairCallError },
      );
    }
    try {
      return BookendsContentSchema.parse(repaired);
    } catch (repairError) {
      throw new ComposedVideoGenerationError(
        `bookends could not be validated after one repair attempt: ${validationMessage(repairError)}`,
        { cause: repairError },
      );
    }
  };

  let raw: unknown;
  try {
    raw = await callModel(systemPrompt, request.prompt, {
      maxTokens: 768,
      temperature: 0.65,
      reasoning: { enabled: false },
    });
  } catch (firstCallError) {
    if (!isRepairableModelOutputFailure(firstCallError)) throw firstCallError;
    return repair(firstCallError, firstCallError.content);
  }

  try {
    return BookendsContentSchema.parse(raw);
  } catch (firstError) {
    return repair(firstError, serializeOutput(raw));
  }
}

function shiftAnimatedValue(value: AnimatedValue | undefined, offset: number) {
  if (!value || !("keyframes" in value)) return value;
  return {
    keyframes: value.keyframes.map((keyframe) => ({
      ...keyframe,
      time: roundTime(keyframe.time + offset),
    })),
  };
}

function shiftEvent(event: TimelineEvent, prefix: string, offset: number): TimelineEvent {
  const shifted = {
    ...event,
    id: `${prefix}-${event.id}`,
    start: roundTime(event.start + offset),
    end: roundTime(event.end + offset),
  } as TimelineEvent;
  const mutable = shifted as unknown as Record<string, unknown>;
  for (const field of ANIMATED_FIELDS) {
    const value = event[field];
    if (value) mutable[field] = shiftAnimatedValue(value, offset);
  }
  return shifted;
}

function prefixProjectEvents(
  project: VideoProject,
  prefix: string,
  offset: number,
): TimelineEvent[] {
  return project.events.map((event) => shiftEvent(event, prefix, offset));
}

function failedSectionMessage(
  section: string,
  reason: PromiseRejectedResult,
): ComposedVideoGenerationError {
  return new ComposedVideoGenerationError(
    `${section} generation failed: ${validationMessage(reason.reason)}`,
    { cause: reason.reason },
  );
}

export async function generateComposedVideo(
  request: GenerateComposedVideoRequest,
  dependencies: ComposedVideoDependencies = DEFAULT_DEPENDENCIES,
): Promise<ComposedVideoResult> {
  const windows = planCompositionWindows(request.duration);
  const theme = resolveVideoPartTheme(request.prompt);
  const palette = PALETTES[theme.palette] ?? PALETTES[DEFAULT_PALETTE];
  const visualContext = JSON.stringify({
    palette: theme.palette,
    colors: {
      backgroundFrom: palette.bgFrom,
      backgroundTo: palette.bgTo,
      primary: palette.accent1,
      secondary: palette.accent2,
      text: palette.text,
      muted: palette.muted,
    },
  });

  const callForPart = (
    part: "bookends" | "summary" | "main-diagram",
  ): ComposedVideoModelCaller => (
    systemPrompt: string,
    userPrompt: string,
    options: OpenRouterOptions = {},
  ) => {
    const nextOptions: OpenRouterOptions = { ...options, signal: dependencies.signal };
    if (dependencies.onModelProgress) nextOptions.onChunk = (chunk) => {
      options.onChunk?.(chunk);
      dependencies.onModelProgress?.(part, chunk);
    };
    if (dependencies.onModelUsage) nextOptions.onUsage = (usage) => {
      options.onUsage?.(usage);
      dependencies.onModelUsage?.(part, usage);
    };
    return dependencies.callModel(systemPrompt, userPrompt, nextOptions);
  };

  const completePart = <T,>(
    part: "bookends" | "summary" | "main-diagram",
    promise: Promise<T>,
  ) => promise.then((value) => {
    dependencies.onModelComplete?.(part);
    return value;
  });

  dependencies.onPhase?.("generating-sections");
  const results = await Promise.allSettled([
    completePart("bookends", generateBookends(request, visualContext, callForPart("bookends"))),
    completePart("summary", generateVideoPart({
      part: "summary",
      prompt: request.prompt,
      duration: windows.summary.duration,
      visualContext,
    }, { callModel: callForPart("summary") })),
    completePart("main-diagram", generateVideoPart({
      part: "main-diagram",
      prompt: request.prompt,
      duration: windows.main.duration,
      visualContext,
    }, { callModel: callForPart("main-diagram") })),
  ]);

  const sectionNames = ["bookends", "summary", "main-diagram"] as const;
  results.forEach((result, index) => {
    if (result.status === "rejected") throw failedSectionMessage(sectionNames[index], result);
  });

  const bookends = (results[0] as PromiseFulfilledResult<BookendsContent>).value;
  const summaryPart = (results[1] as PromiseFulfilledResult<Awaited<ReturnType<typeof generateVideoPart>>>).value;
  const mainPart = (results[2] as PromiseFulfilledResult<Awaited<ReturnType<typeof generateVideoPart>>>).value;
  if (summaryPart.part !== "summary" || mainPart.part !== "main-diagram") {
    throw new ComposedVideoGenerationError("Generated sections returned the wrong contracts.");
  }

  dependencies.onPhase?.("composing");
  const introProject = buildStandaloneVideoPartProject({
    part: "title",
    content: { title: bookends.title, subtitle: bookends.subtitle },
  }, windows.intro.duration, theme);
  const conclusionProject = buildStandaloneVideoPartProject({
    part: "conclusion",
    content: { closingLine: bookends.closingLine },
  }, windows.conclusion.duration, theme);

  const events = [
    ...prefixProjectEvents(introProject, "intro", windows.intro.start),
    ...prefixProjectEvents(summaryPart.project, "summary", windows.summary.start),
    ...prefixProjectEvents(mainPart.project, "main", windows.main.start),
    ...prefixProjectEvents(conclusionProject, "conclusion", windows.conclusion.start),
  ].sort((first, second) => (first.start - second.start) || (first.layer - second.layer));
  const hash = seededHash(JSON.stringify({ request, bookends, summaryPart: summaryPart.content, mainPart: mainPart.content }));
  const project: VideoProject = {
    id: `composed-${hash.toString(16)}`,
    name: bookends.title,
    width: 1920,
    height: 1080,
    duration: request.duration,
    events,
  };

  return {
    project,
    projectName: bookends.title,
    summary: summaryPart.content.name,
    parts: {
      bookends,
      summary: summaryPart.content,
      mainDiagram: mainPart.content,
    },
  };
}
