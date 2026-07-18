import type { EvaluationCase } from "@/lib/evaluation/cases";
import type { EvaluationDiagnostic } from "@/lib/evaluation/diagnostics";
import type { Usage } from "@/lib/agent/rootGeneration/openrouter";
import type { VideoProject } from "@/lib/ui/renderer";

export type GenerationPath = "root" | "dev";

export type CapturedModelCall = {
  sequence: number;
  model: string;
  options: {
    maxTokens?: number;
    temperature?: number;
    reasoning?: { enabled: boolean };
  };
  systemPrompt: string;
  userPrompt: string | Array<unknown>;
  startedAt: string;
  finishedAt: string;
  rawOutput?: unknown;
  failure?: {
    name: string;
    message: string;
    rawContent?: string;
  };
  usage?: Usage;
};

export type EvaluationArtifactMetadata = {
  schemaVersion: 1;
  evaluationId: string;
  artifactId: string;
  caseId: string;
  category: EvaluationCase["category"];
  prompt: string;
  duration: EvaluationCase["duration"];
  generationPath: GenerationPath;
  repetition: number;
  startedAt: string;
  finishedAt: string;
  modelIdentity: string[];
  modelCalls: CapturedModelCall[];
  rawFailure?: { name: string; message: string; rawContent?: string };
  normalizedProject?: VideoProject;
  diagnostics: EvaluationDiagnostic[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  renderedFrames: string[];
};

function serializeFailure(error: unknown) {
  if (error instanceof Error) {
    const rawContent = "content" in error && typeof error.content === "string"
      ? error.content
      : undefined;
    return { name: error.name, message: error.message, ...(rawContent ? { rawContent } : {}) };
  }
  return { name: "UnknownFailure", message: String(error) };
}

export function createArtifactMetadata(input: {
  evaluationId: string;
  caseDefinition: EvaluationCase;
  generationPath: GenerationPath;
  repetition: number;
  startedAt: string;
  finishedAt: string;
  modelCalls: CapturedModelCall[];
  normalizedProject?: VideoProject;
  diagnostics: EvaluationDiagnostic[];
  rawFailure?: unknown;
  renderedFrames?: string[];
}): EvaluationArtifactMetadata {
  const usageRecords = input.modelCalls.flatMap((call) => call.usage ? [call.usage] : []);
  return {
    schemaVersion: 1,
    evaluationId: input.evaluationId,
    artifactId: `${input.caseDefinition.id}-${input.generationPath}-${input.repetition}`,
    caseId: input.caseDefinition.id,
    category: input.caseDefinition.category,
    prompt: input.caseDefinition.prompt,
    duration: input.caseDefinition.duration,
    generationPath: input.generationPath,
    repetition: input.repetition,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    modelIdentity: [...new Set(input.modelCalls.map((call) => call.model))],
    modelCalls: input.modelCalls,
    ...(input.rawFailure === undefined ? {} : { rawFailure: serializeFailure(input.rawFailure) }),
    ...(input.normalizedProject === undefined ? {} : { normalizedProject: input.normalizedProject }),
    diagnostics: input.diagnostics,
    usage: usageRecords.length === 0 ? null : {
      promptTokens: usageRecords.reduce((sum, usage) => sum + usage.prompt_tokens, 0),
      completionTokens: usageRecords.reduce((sum, usage) => sum + usage.completion_tokens, 0),
      totalTokens: usageRecords.reduce((sum, usage) => sum + usage.total_tokens, 0),
    },
    renderedFrames: input.renderedFrames ?? [],
  };
}

export function captureFailure(error: unknown): CapturedModelCall["failure"] {
  return serializeFailure(error);
}
