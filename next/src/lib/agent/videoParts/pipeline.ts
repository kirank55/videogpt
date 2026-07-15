import { z } from "zod";
import { callOpenRouter } from "@/lib/agent/ai/openrouter";
import { validateDirectTimelineContent } from "@/lib/agent/videoParts/directTimeline";
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
  options?: {
    maxTokens?: number;
    temperature?: number;
    reasoning?: { enabled: boolean };
  },
) => Promise<unknown>;

export type VideoPartPipelineDependencies = {
  callModel: VideoPartModelCaller;
};

const DEFAULT_DEPENDENCIES: VideoPartPipelineDependencies = {
  callModel: callOpenRouter,
};

const MAX_TOKENS: Record<VideoPartKind, number> = {
  title: 512,
  summary: 4096,
  "main-diagram": 16384,
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

function serializeModelOutput(raw: unknown): string {
  try {
    return JSON.stringify(raw, null, 2) ?? String(raw);
  } catch {
    return String(raw);
  }
}

type RepairableModelOutputFailure = Error & {
  name: "OpenRouterJsonParseError" | "OpenRouterLengthError";
  content?: string;
  finishReason?: string;
};

function isRepairableModelOutputFailure(
  error: unknown,
): error is RepairableModelOutputFailure {
  if (!(error instanceof Error)) return false;
  if (error.name === "OpenRouterLengthError") return true;
  return error.name === "OpenRouterJsonParseError"
    && "content" in error
    && typeof error.content === "string";
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
  const options = {
    maxTokens: MAX_TOKENS[request.part],
    temperature: request.part === "main-diagram" ? 0.8 : 0.65,
    reasoning: { enabled: false },
  };

  const parseGeneratedPart = (raw: unknown): AuthoredVideoPart => {
    if (request.part === "main-diagram") {
      return {
        part: request.part,
        content: validateDirectTimelineContent(raw, request.duration),
      };
    }
    return parseAuthoredVideoPart(request.part, raw);
  };

  const finalize = (artifact: AuthoredVideoPart): GeneratedVideoPart => {
    const theme = resolveVideoPartTheme(request.prompt);
    const project = buildStandaloneVideoPartProject(artifact, request.duration, theme);
    return { ...artifact, project } as GeneratedVideoPart;
  };

  const repair = async (
    firstError: unknown,
    previousOutput?: string,
  ): Promise<AuthoredVideoPart> => {
    const repairPrompt = buildVideoPartRepairPrompt(
      request.prompt,
      validationMessage(firstError),
      previousOutput,
    );
    let repaired: unknown;
    try {
      repaired = await dependencies.callModel(
        systemPrompt,
        repairPrompt,
        { ...options, temperature: 0.2 },
      );
    } catch (repairCallError) {
      if (!isRepairableModelOutputFailure(repairCallError)) throw repairCallError;
      throw new VideoPartGenerationError(
        `Generated ${request.part} data remained invalid JSON after one repair attempt: ${validationMessage(repairCallError)}`,
        { cause: repairCallError },
      );
    }

    try {
      return parseGeneratedPart(repaired);
    } catch (repairError) {
      throw new VideoPartGenerationError(
        `Generated ${request.part} data could not be validated after one repair attempt: ${validationMessage(repairError)}`,
        { cause: repairError },
      );
    }
  };

  let raw: unknown;
  try {
    raw = await dependencies.callModel(systemPrompt, request.prompt, options);
  } catch (firstCallError) {
    if (!isRepairableModelOutputFailure(firstCallError)) throw firstCallError;
    const artifact = await repair(firstCallError, firstCallError.content);
    return finalize(artifact);
  }

  let artifact: AuthoredVideoPart;
  try {
    artifact = parseGeneratedPart(raw);
  } catch (firstError) {
    artifact = await repair(firstError, serializeModelOutput(raw));
  }

  return finalize(artifact);
}
