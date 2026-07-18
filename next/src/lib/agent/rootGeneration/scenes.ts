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
import { buildVideoSceneSystemPrompt } from "@/lib/agent/rootGeneration/prompts";
import type {
  MainDiagramPartContent,
  SummaryPartContent,
} from "@/lib/agent/rootGeneration/schemas";
import type { VideoProject } from "@/lib/ui/renderer";

export type VideoSceneContent = SummaryPartContent | MainDiagramPartContent;

export type GeneratedVideoScene = {
  scene: VideoScene;
  content: VideoSceneContent;
  project: VideoProject;
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
};

function isRepairableModelOutputFailure(
  error: unknown,
): error is RepairableModelOutputFailure {
  return error instanceof Error
    && (error.name === "OpenRouterJsonParseError" || error.name === "OpenRouterLengthError");
}

/**
 * Generates one planned scene as a direct timeline. Scene roles map onto the
 * two existing timeline profiles: overview stays compact, detailed roles
 * scale with duration. Scenes never spend repair requests; malformed output
 * becomes the deterministic renderer-safe fallback.
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

  const finalize = (content: VideoSceneContent): GeneratedVideoScene => ({
    scene: request.scene,
    content,
    project: compact
      ? buildDirectSummaryProject(content, request.duration)
      : buildDirectTimelineProject(content, request.duration),
  });

  let raw: unknown;
  try {
    raw = await dependencies.callModel(systemPrompt, request.prompt, {
      maxTokens: budget.maxTokens,
      temperature: compact ? 0.65 : 0.5,
      reasoning: { enabled: false },
    });
  } catch (callError) {
    if (!isRepairableModelOutputFailure(callError)) throw callError;
    return finalize(parseScene({}));
  }

  try {
    return finalize(parseScene(raw));
  } catch {
    return finalize(parseScene({}));
  }
}

