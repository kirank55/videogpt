import { z } from "zod";
import { callOpenRouter, type OpenRouterOptions, type Usage } from "@/lib/agent/ai/openrouter";
import type { VideoPartModelCaller } from "@/lib/agent/videoParts/pipeline";
import {
  planSceneWindows,
  planVideoScenes,
  type VideoPlan,
} from "@/lib/agent/videoParts/planner";
import { buildStandaloneVideoPartProject } from "@/lib/agent/videoParts/project";
import {
  generateVideoScene,
  type GeneratedVideoScene,
} from "@/lib/agent/videoParts/scenes";
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

export type ComposedVideoResult = {
  project: VideoProject;
  projectName: string;
  summary: string;
  plan: VideoPlan;
  scenes: GeneratedVideoScene[];
};

export type ComposedVideoDependencies = {
  callModel: ComposedVideoModelCaller;
  onPhase?: (phase: "planning" | "generating-sections" | "composing") => void;
  onPlan?: (plan: VideoPlan) => void;
  onModelProgress?: (
    part: string,
    progress: { characterCount: number },
  ) => void;
  onModelUsage?: (
    part: string,
    usage: Usage,
  ) => void;
  onModelComplete?: (part: string) => void;
  signal?: AbortSignal;
};

const DEFAULT_DEPENDENCIES: ComposedVideoDependencies = {
  callModel: callOpenRouter,
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

function validationMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .slice(0, 8)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
  }
  return error instanceof Error ? error.message : String(error);
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

  const callForPart = (part: string): ComposedVideoModelCaller => (
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

  const completePart = <T,>(part: string, promise: Promise<T>) => promise.then((value) => {
    dependencies.onModelComplete?.(part);
    return value;
  });

  dependencies.onPhase?.("planning");
  const plan = await completePart(
    "plan",
    planVideoScenes(request, { callModel: callForPart("plan") }),
  );
  dependencies.onPlan?.(plan);
  const windows = planSceneWindows(plan, request.duration);

  dependencies.onPhase?.("generating-sections");
  const results = await Promise.allSettled(
    windows.scenes.map((window) =>
      completePart(window.scene.id, generateVideoScene({
        plan,
        scene: window.scene,
        prompt: request.prompt,
        duration: window.duration,
        visualContext,
      }, { callModel: callForPart(window.scene.id) }))
    ),
  );
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      throw failedSectionMessage(windows.scenes[index].scene.id, result);
    }
  });
  const scenes = results.map(
    (result) => (result as PromiseFulfilledResult<GeneratedVideoScene>).value,
  );

  dependencies.onPhase?.("composing");
  const introProject = buildStandaloneVideoPartProject({
    part: "title",
    content: { title: plan.title, subtitle: plan.subtitle },
  }, windows.intro.duration, theme);
  const conclusionProject = buildStandaloneVideoPartProject({
    part: "conclusion",
    content: { closingLine: plan.closingLine },
  }, windows.conclusion.duration, theme);

  const events = [
    ...prefixProjectEvents(introProject, "intro", windows.intro.start),
    ...scenes.flatMap((generated, index) =>
      prefixProjectEvents(generated.project, generated.scene.id, windows.scenes[index].start)
    ),
    ...prefixProjectEvents(conclusionProject, "conclusion", windows.conclusion.start),
  ].sort((first, second) => (first.start - second.start) || (first.layer - second.layer));
  const hash = seededHash(JSON.stringify({
    request,
    plan,
    scenes: scenes.map((generated) => generated.content),
  }));
  const chapters = [
    { name: "Introduction", time: windows.intro.start },
    ...scenes.map((generated, index) => ({
      name: generated.scene.name,
      time: windows.scenes[index].start,
    })),
    { name: "Conclusion", time: windows.conclusion.start },
  ];
  const project: VideoProject = {
    id: `composed-${hash.toString(16)}`,
    name: plan.title,
    width: 1920,
    height: 1080,
    duration: request.duration,
    events,
    chapters,
  };

  return {
    project,
    projectName: plan.title,
    summary: plan.logline,
    plan,
    scenes,
  };
}
