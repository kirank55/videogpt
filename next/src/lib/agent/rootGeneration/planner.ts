import { z } from "zod";
import {
  callOpenRouter,
  type RootGenerationModelCaller,
} from "@/lib/agent/rootGeneration/openrouter";
import {
  buildVideoPartRepairPrompt,
  buildVideoPlannerSystemPrompt,
} from "@/lib/agent/rootGeneration/prompts";
import { maxContentScenesForDuration } from "@/lib/agent/rootGeneration/planningPolicy";
import type { SupportedDuration } from "@/lib/others/schemas/duration";

export const PLANNER_MAX_TOKENS = 768;
const MAX_SCENE_ID_LENGTH = 24;

export const VideoSceneRoleSchema = z.enum([
  "overview",
  "mechanism",
  "example",
  "comparison",
]);
export type VideoSceneRole = z.infer<typeof VideoSceneRoleSchema>;

export const VideoSceneSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).min(1).max(MAX_SCENE_ID_LENGTH),
  role: VideoSceneRoleSchema,
  name: z.string().min(1).max(40),
  goal: z.string().min(1).max(300),
  share: z.number().positive().max(1),
}).strict();
export type VideoScene = z.infer<typeof VideoSceneSchema>;

export const VideoPlanSchema = z.object({
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(120).optional(),
  closingLine: z.string().min(1).max(100),
  logline: z.string().min(1).max(160),
  scenes: z.array(VideoSceneSchema).min(1).max(4),
}).strict();
export type VideoPlan = z.infer<typeof VideoPlanSchema>;

const VideoPlanModelOutputSchema = VideoPlanSchema.extend({
  scenes: z.array(VideoSceneSchema).min(1),
});

export type SceneWindow = {
  scene: VideoScene;
  start: number;
  end: number;
  duration: number;
};

export type SceneWindows = {
  intro: { start: number; end: number; duration: number };
  scenes: SceneWindow[];
  conclusion: { start: number; end: number; duration: number };
};

export class VideoPlanningError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VideoPlanningError";
  }
}

const BOOKEND_DURATION: Record<SupportedDuration, number> = {
  5: 0.85,
  10: 1.05,
  15: 1.35,
  20: 1.5,
};

const MIN_SCENE_DURATION = 0.8;

function selectScenesForDuration(
  scenes: VideoScene[],
  duration: SupportedDuration,
): VideoScene[] {
  const ceiling = maxContentScenesForDuration(duration);
  const substantive = scenes.filter((scene) => scene.role !== "overview");
  const overview = scenes.find((scene) => scene.role === "overview");
  const ordered = overview ? [overview, ...substantive] : substantive;
  if (duration === 5) return substantive.slice(0, 1);
  if (ordered.length <= ceiling) return ordered;
  if (substantive.length >= ceiling) return substantive.slice(0, ceiling);
  return overview ? [overview, ...substantive].slice(0, ceiling) : substantive;
}

function roundTime(value: number): number {
  return Number(value.toFixed(3));
}

/**
 * Splits `total` across shares proportionally, locking any under-allocated
 * scene to the minimum and redistributing the remainder across the rest.
 */
function allocateDurations(shares: number[], total: number, minEach: number): number[] {
  const minimum = Math.min(minEach, total / shares.length);
  const result = new Array<number>(shares.length).fill(0);
  const remaining = new Set(shares.map((_, index) => index));
  let pool = total;
  for (let pass = 0; pass <= shares.length && remaining.size > 0; pass += 1) {
    const shareSum = [...remaining].reduce((sum, index) => sum + shares[index], 0);
    let lockedAny = false;
    for (const index of [...remaining]) {
      if ((shares[index] / shareSum) * pool < minimum) {
        result[index] = minimum;
        pool -= minimum;
        remaining.delete(index);
        lockedAny = true;
      }
    }
    if (!lockedAny) {
      for (const index of remaining) result[index] = (shares[index] / shareSum) * pool;
      remaining.clear();
    }
  }
  return result;
}

/**
 * Splits the total duration into contiguous windows: a deterministic intro,
 * one window per planned scene sized by normalized share, and a conclusion.
 */
export function planSceneWindows(
  plan: VideoPlan,
  duration: SupportedDuration,
): SceneWindows {
  const bookend = BOOKEND_DURATION[duration];
  const contentDuration = roundTime(duration - bookend * 2);
  const scenes = selectScenesForDuration(plan.scenes, duration);
  const durations = allocateDurations(
    scenes.map((scene) => scene.share),
    contentDuration,
    MIN_SCENE_DURATION,
  );

  let cursor = bookend;
  const windows = scenes.map((scene, index) => {
    const sceneDuration = index === scenes.length - 1
      ? roundTime(bookend + contentDuration - cursor)
      : roundTime(durations[index]);
    const window: SceneWindow = {
      scene,
      start: roundTime(cursor),
      end: roundTime(cursor + sceneDuration),
      duration: sceneDuration,
    };
    cursor = window.end;
    return window;
  });

  return {
    intro: { start: 0, end: bookend, duration: bookend },
    scenes: windows,
    conclusion: { start: roundTime(duration - bookend), end: duration, duration: bookend },
  };
}

/** Deterministic plan used when the planner request cannot be completed. */
export function defaultVideoPlan(
  prompt: string,
  duration: SupportedDuration,
): VideoPlan {
  const normalized = prompt.trim().replace(/\s+/g, " ");
  const title = normalized.length <= 60
    ? normalized
    : `${normalized.slice(0, 57).replace(/\s+\S*$/, "")}…`;
  const fallbackScenes: VideoScene[] = [
    {
      id: "mechanism",
      role: "mechanism",
      name: "How it works",
      goal: `Explain the underlying mechanism of: ${normalized}`.slice(0, 300),
      share: 1,
    },
    {
      id: "worked-example",
      role: "example",
      name: "Concrete example",
      goal: `Show a concrete example of: ${normalized}`.slice(0, 300),
      share: 1,
    },
    {
      id: "comparison",
      role: "comparison",
      name: "Meaningful contrast",
      goal: `Contrast the most relevant alternatives within: ${normalized}`.slice(0, 300),
      share: 1,
    },
    {
      id: "second-mechanism",
      role: "mechanism",
      name: "Deeper mechanism",
      goal: `Explain a complementary mechanism within: ${normalized}`.slice(0, 300),
      share: 1,
    },
  ];
  const selectedScenes = fallbackScenes.slice(0, maxContentScenesForDuration(duration));
  const share = 1 / selectedScenes.length;
  return {
    title,
    closingLine: "That's the idea, step by step.",
    logline: normalized.slice(0, 160),
    scenes: selectedScenes.map((scene) => ({ ...scene, share })),
  };
}

const RESERVED_SCENE_IDS = new Set(["intro", "conclusion", "plan"]);

/** Guarantees unique, composition-safe scene ids without discarding the plan. */
function normalizeSceneIds(plan: VideoPlan): VideoPlan {
  const used = new Set<string>();
  const scenes = plan.scenes.map((scene) => {
    let id = scene.id;
    if (RESERVED_SCENE_IDS.has(id)) id = `scene-${id}`;
    let suffix = 2;
    while (used.has(id)) {
      const suffixText = `-${suffix}`;
      const base = scene.id
        .slice(0, MAX_SCENE_ID_LENGTH - suffixText.length)
        .replace(/-+$/, "");
      id = `${base}${suffixText}`;
      suffix += 1;
    }
    used.add(id);
    return id === scene.id ? scene : { ...scene, id };
  });
  return { ...plan, scenes };
}

function normalizeScenesForDuration(
  plan: VideoPlan,
  duration: SupportedDuration,
): VideoPlan {
  const scenes = selectScenesForDuration(plan.scenes, duration);
  if (!scenes.some((scene) => scene.role !== "overview")) {
    throw new VideoPlanningError(
      "video plans require at least one substantive scene",
    );
  }
  return { ...plan, scenes };
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

export type VideoPlannerDependencies = {
  callModel: RootGenerationModelCaller;
};

const DEFAULT_DEPENDENCIES: VideoPlannerDependencies = {
  callModel: callOpenRouter,
};

/**
 * Plans the video as one title/closing copy block plus a dynamic scene list.
 * Invalid planner output gets one targeted repair; total failure falls back
 * to a deterministic two-scene plan so generation can still proceed.
 */
export async function planVideoScenes(
  request: { prompt: string; duration: SupportedDuration },
  dependencies: VideoPlannerDependencies = DEFAULT_DEPENDENCIES,
): Promise<VideoPlan> {
  const systemPrompt = buildVideoPlannerSystemPrompt(request.duration);
  const options = {
    maxTokens: PLANNER_MAX_TOKENS,
    temperature: 0.4,
    reasoning: { enabled: false },
  };

  const parsePlan = (raw: unknown): VideoPlan => VideoPlanSchema.parse(
    normalizeSceneIds(
      normalizeScenesForDuration(
        VideoPlanModelOutputSchema.parse(raw),
        request.duration,
      ),
    ),
  );

  const repair = async (firstError: unknown, previousOutput?: string): Promise<VideoPlan> => {
    const repairPrompt = buildVideoPartRepairPrompt(
      request.prompt,
      validationMessage(firstError),
      previousOutput,
    );
    let repaired: unknown;
    try {
      repaired = await dependencies.callModel(systemPrompt, repairPrompt, {
        ...options,
        temperature: 0.2,
      });
    } catch (repairCallError) {
      if (!isRepairableModelOutputFailure(repairCallError)) throw repairCallError;
      throw new VideoPlanningError(
        `video plan remained invalid JSON after one repair attempt: ${validationMessage(repairCallError)}`,
        { cause: repairCallError },
      );
    }
    return parsePlan(repaired);
  };

  let raw: unknown;
  try {
    raw = await dependencies.callModel(systemPrompt, request.prompt, options);
  } catch (firstCallError) {
    if (!isRepairableModelOutputFailure(firstCallError)) {
      console.warn("[planner] falling back to the default plan:", firstCallError);
      return defaultVideoPlan(request.prompt, request.duration);
    }
    try {
      return await repair(firstCallError, firstCallError.content);
    } catch (repairError) {
      console.warn("[planner] repair failed, falling back to the default plan:", repairError);
      return defaultVideoPlan(request.prompt, request.duration);
    }
  }

  try {
    return parsePlan(raw);
  } catch (firstError) {
    try {
      return await repair(firstError, serializeOutput(raw));
    } catch (repairError) {
      console.warn("[planner] repair failed, falling back to the default plan:", repairError);
      return defaultVideoPlan(request.prompt, request.duration);
    }
  }
}
