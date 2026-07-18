import {
  callOpenRouter,
  type RootGenerationModelCaller,
} from "@/lib/agent/rootGeneration/openrouter";
import { getVideoPartBudget } from "@/lib/agent/rootGeneration/budgets";
import {
  buildDirectSummaryProject,
  buildDirectTimelineProject,
  validateDirectSummaryContent,
  validateDirectTimelineContent,
} from "@/lib/agent/rootGeneration/directTimeline";
import type { VideoPlan, VideoScene } from "@/lib/agent/rootGeneration/planner";
import {
  buildVideoPartRepairPrompt,
  buildVideoSceneSystemPrompt,
} from "@/lib/agent/rootGeneration/prompts";
import type {
  MainDiagramPartContent,
  SummaryPartContent,
} from "@/lib/agent/rootGeneration/schemas";
import type { VideoProject } from "@/lib/ui/renderer";

export type VideoSceneContent = SummaryPartContent | MainDiagramPartContent;

export type VideoSceneDiagnostic = {
  code: "degraded-scene";
  reason: string;
  repairAttempted: true;
};

export type GeneratedVideoScene = {
  scene: VideoScene;
  content: VideoSceneContent;
  project: VideoProject;
  diagnostics: VideoSceneDiagnostic[];
};

export type GenerateVideoSceneInput = {
  plan: VideoPlan;
  scene: VideoScene;
  prompt: string;
  duration: number;
  visualContext?: string;
};

export type VideoScenePipelineDependencies = {
  callModel: RootGenerationModelCaller;
};

const DEFAULT_DEPENDENCIES: VideoScenePipelineDependencies = {
  callModel: callOpenRouter,
};

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

function isEffectivelyEmptyTimeline(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return true;
  const events = (raw as { events?: unknown }).events;
  return !Array.isArray(events)
    || !events.some((event) => {
      if (!event || typeof event !== "object" || Array.isArray(event)) return false;
      const type = (event as { type?: unknown }).type;
      return type === "background"
        || type === "text"
        || type === "shape"
        || type === "particle";
    });
}

function serializeOutput(raw: unknown): string | undefined {
  try {
    const serialized = JSON.stringify(raw);
    return serialized === undefined ? undefined : serialized;
  } catch {
    return undefined;
  }
}

/**
 * Generates one planned scene as a direct timeline. Scene roles map onto the
 * two existing timeline profiles: overview stays compact, substantive roles
 * scale with duration. Unusable substantive output gets one targeted repair;
 * recoverable output is normalized locally and overview remains single-shot.
 */
export async function generateVideoScene(
  request: GenerateVideoSceneInput,
  dependencies: VideoScenePipelineDependencies = DEFAULT_DEPENDENCIES,
): Promise<GeneratedVideoScene> {
  const compact = request.scene.role === "overview";
  const systemPrompt = buildVideoSceneSystemPrompt(
    request.plan,
    request.scene,
    request.duration,
    request.visualContext,
  );
  const budget = getVideoPartBudget(compact ? "summary" : "main-diagram", request.duration);

  const parseScene = (raw: unknown): VideoSceneContent => compact
    ? validateDirectSummaryContent(raw, request.duration)
    : validateDirectTimelineContent(raw, request.duration);

  const finalize = (
    content: VideoSceneContent,
    diagnostics: VideoSceneDiagnostic[] = [],
  ): GeneratedVideoScene => ({
    scene: request.scene,
    content,
    project: compact
      ? buildDirectSummaryProject(content, request.duration)
      : buildDirectTimelineProject(content, request.duration),
    diagnostics,
  });
  const fallback = () => finalize(parseScene({}));
  const degradedFallback = (reason: unknown) => finalize(parseScene({}), [{
    code: "degraded-scene",
    reason: reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason),
    repairAttempted: true,
  }]);
  const repair = async (
    firstError: unknown,
    previousOutput?: string,
  ): Promise<GeneratedVideoScene> => {
    const sceneBrief = [
      `VIDEO TOPIC: ${request.prompt}`,
      `SCENE: ${request.scene.id}`,
      `SCENE ROLE: ${request.scene.role}`,
      `SCENE GOAL: ${request.scene.goal}`,
      `SEGMENT DURATION: ${request.duration}s`,
    ].join("\n");
    const validationFinding = firstError instanceof Error
      ? `${firstError.name}: ${firstError.message}`
      : String(firstError);
    let repaired: unknown;
    try {
      repaired = await dependencies.callModel(
        systemPrompt,
        buildVideoPartRepairPrompt(sceneBrief, validationFinding, previousOutput),
        {
          maxTokens: budget.maxTokens,
          temperature: 0.2,
          reasoning: { enabled: false },
        },
      );
    } catch (repairError) {
      if (!isRepairableModelOutputFailure(repairError)) throw repairError;
      return degradedFallback(repairError);
    }
    if (isEffectivelyEmptyTimeline(repaired)) {
      return degradedFallback(
        new Error("events: repaired substantive timeline is effectively empty"),
      );
    }
    try {
      return finalize(parseScene(repaired));
    } catch (repairValidationError) {
      return degradedFallback(repairValidationError);
    }
  };

  let raw: unknown;
  try {
    raw = await dependencies.callModel(systemPrompt, request.prompt, {
      maxTokens: budget.maxTokens,
      temperature: compact ? 0.65 : 0.5,
      reasoning: { enabled: false },
    });
  } catch (callError) {
    if (!isRepairableModelOutputFailure(callError)) throw callError;
    if (compact) return fallback();
    return repair(callError, callError.content);
  }

  if (!compact && isEffectivelyEmptyTimeline(raw)) {
    return repair(
      new Error("events: substantive timeline is effectively empty"),
      serializeOutput(raw),
    );
  }

  try {
    return finalize(parseScene(raw));
  } catch {
    return fallback();
  }
}
