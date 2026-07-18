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

const OVERVIEW_USEFUL_DURATION = 2;
const SUBSTANTIVE_USEFUL_DURATION = 3.3;

function selectScenesForDuration(
  scenes: VideoScene[],
  duration: SupportedDuration,
): VideoScene[] {
  const ceiling = maxContentScenesForDuration(duration);
  const substantive = scenes.filter((scene) => scene.role !== "overview");
  const overview = scenes.find((scene) => scene.role === "overview");
  const ordered = overview ? [overview, ...substantive] : substantive;
  if (ordered.length <= ceiling) return ordered;
  if (substantive.length >= ceiling) {
    const retained = new Set(
      substantive
        .map((scene, index) => ({ scene, index }))
        .sort((first, second) =>
          (second.scene.share - first.scene.share) || (first.index - second.index)
        )
        .slice(0, ceiling)
        .map(({ scene }) => scene),
    );
    return substantive.filter((scene) => retained.has(scene));
  }
  return overview ? [overview, ...substantive].slice(0, ceiling) : substantive;
}

function roundTime(value: number): number {
  return Number(value.toFixed(3));
}

function usefulDurationFor(scene: VideoScene): number {
  return scene.role === "overview"
    ? OVERVIEW_USEFUL_DURATION
    : SUBSTANTIVE_USEFUL_DURATION;
}

function usefulDurationTotal(scenes: VideoScene[]): number {
  return scenes.reduce((total, scene) => total + usefulDurationFor(scene), 0);
}

/**
 * Keeps the most useful mix that can receive non-fragmentary windows.
 * Overview is optional; further ties remove the later, lower-share scene.
 */
function retainScenesWithUsefulWindows(
  selectedScenes: VideoScene[],
  total: number,
): VideoScene[] {
  const scenes = [...selectedScenes];
  while (scenes.length > 1 && usefulDurationTotal(scenes) > total) {
    const overviewIndex = scenes.findIndex((scene) => scene.role === "overview");
    if (overviewIndex >= 0) {
      scenes.splice(overviewIndex, 1);
      continue;
    }
    const removableIndex = scenes.reduce((lowestIndex, scene, index) => {
      if (index === 0) return 0;
      const lowest = scenes[lowestIndex];
      return scene.share <= lowest.share ? index : lowestIndex;
    }, 0);
    scenes.splice(removableIndex, 1);
  }
  return scenes;
}

/**
 * Reserves a useful floor for each scene, then treats planner shares as
 * preferences for distributing only the remaining content time.
 */
function allocateDurations(scenes: VideoScene[], total: number): number[] {
  const totalMilliseconds = Math.round(total * 1_000);
  const floorMilliseconds = scenes.map((scene) =>
    Math.round(usefulDurationFor(scene) * 1_000)
  );
  const floorTotal = floorMilliseconds.reduce((sum, floor) => sum + floor, 0);
  const remaining = Math.max(0, totalMilliseconds - floorTotal);
  const shareTotal = scenes.reduce((sum, scene) => sum + scene.share, 0);
  const proportional = scenes.map((scene, index) => {
    const exact = (scene.share / shareTotal) * remaining;
    return {
      index,
      milliseconds: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  const allocated = proportional.reduce(
    (sum, allocation) => sum + allocation.milliseconds,
    0,
  );
  const bonuses = new Set(
    [...proportional]
      .sort((first, second) =>
        (second.remainder - first.remainder) || (second.index - first.index)
      )
      .slice(0, remaining - allocated)
      .map(({ index }) => index),
  );
  return proportional.map(({ index, milliseconds }) =>
    (floorMilliseconds[index] + milliseconds + (bonuses.has(index) ? 1 : 0)) / 1_000
  );
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
  const scenes = retainScenesWithUsefulWindows(
    selectScenesForDuration(plan.scenes, duration),
    contentDuration,
  );
  const durations = allocateDurations(scenes, contentDuration);

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
