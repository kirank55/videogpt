import { z } from "zod";
import { callOpenRouter } from "@/lib/agent/ai/openrouter";
import { buildStandaloneVideoPartProject } from "@/lib/agent/videoParts/project";
import {
  parseAuthoredVideoPart,
  type AuthoredVideoPart,
  type GeneratedVideoPart,
  type GenerateVideoPartRequest,
  type VideoPartKind,
} from "@/lib/agent/videoParts/schemas";
import {
  buildVideoPartRepairPrompt,
  buildVideoPartSystemPrompt,
} from "@/lib/agent/videoParts/prompts";
import { resolveVideoPartTheme } from "@/lib/agent/videoParts/theme";

export type VideoPartModelCaller = (
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number },
) => Promise<unknown>;

export type VideoPartPipelineDependencies = {
  callModel: VideoPartModelCaller;
};

const DEFAULT_DEPENDENCIES: VideoPartPipelineDependencies = {
  callModel: callOpenRouter,
};

const MAX_TOKENS: Record<VideoPartKind, number> = {
  title: 512,
  summary: 2400,
  "main-diagram": 8192,
  conclusion: 384,
};

export class VideoPartGenerationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VideoPartGenerationError";
  }
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

/**
 * Generates exactly one authored video part, validates its strict contract,
 * and expands it to an isolated renderable project. Invalid JSON receives one
 * schema-guided repair attempt; provider failures are allowed to surface.
 */
export async function generateVideoPart(
  request: GenerateVideoPartRequest,
  dependencies: VideoPartPipelineDependencies = DEFAULT_DEPENDENCIES,
): Promise<GeneratedVideoPart> {
  const systemPrompt = buildVideoPartSystemPrompt(request.part, request.duration);
  const options = { maxTokens: MAX_TOKENS[request.part], temperature: 0.65 };
  const raw = await dependencies.callModel(systemPrompt, request.prompt, options);

  let artifact: AuthoredVideoPart;
  try {
    artifact = parseAuthoredVideoPart(request.part, raw);
  } catch (firstError) {
    const repairPrompt = buildVideoPartRepairPrompt(
      request.prompt,
      validationMessage(firstError),
    );
    const repaired = await dependencies.callModel(systemPrompt, repairPrompt, options);
    try {
      artifact = parseAuthoredVideoPart(request.part, repaired);
    } catch (repairError) {
      throw new VideoPartGenerationError(
        `Generated ${request.part} data could not be validated after one repair attempt: ${validationMessage(repairError)}`,
        { cause: repairError },
      );
    }
  }

  const theme = resolveVideoPartTheme(request.prompt);
  const project = buildStandaloneVideoPartProject(artifact, request.duration, theme);
  return { ...artifact, project } as GeneratedVideoPart;
}
