import { describe, expect, it } from "vitest";
import {
  defaultVideoPlan,
  planSceneWindows,
  planVideoScenes,
  VideoPlanSchema,
  type VideoPlan,
} from "@/lib/agent/videoParts/planner";
import type { VideoPartModelCaller } from "@/lib/agent/videoParts/pipeline";

const basePlan: VideoPlan = {
  title: "Solar Power",
  closingLine: "Separated charge becomes useful current.",
  logline: "How solar cells turn sunlight into current.",
  scenes: [
    { id: "overview", role: "overview", name: "At a glance", goal: "Introduce the cell.", share: 0.25 },
    { id: "cell", role: "mechanism", name: "Inside the cell", goal: "Charge separation.", share: 0.5 },
    { id: "panels", role: "comparison", name: "Panel types", goal: "Compare cell types.", share: 0.25 },
  ],
};

describe("planSceneWindows", () => {
  it.each([
    [5, 0.85],
    [10, 1.05],
    [15, 1.35],
    [20, 1.5],
  ] as const)("plans contiguous windows for %ss", (duration, bookend) => {
    const windows = planSceneWindows(basePlan, duration);
    expect(windows.intro).toEqual({ start: 0, end: bookend, duration: bookend });
    expect(windows.conclusion).toEqual({
      start: duration - bookend,
      end: duration,
      duration: bookend,
    });
    expect(windows.scenes[0].start).toBe(windows.intro.end);
    windows.scenes.forEach((window, index) => {
      expect(window.end).toBeCloseTo(window.start + window.duration, 3);
      const nextStart = windows.scenes[index + 1]?.start ?? windows.conclusion.start;
      expect(window.end).toBeCloseTo(nextStart, 3);
    });
  });

  it("sizes scenes proportionally to their shares", () => {
    const windows = planSceneWindows(basePlan, 10);
    expect(windows.scenes.map((window) => window.duration)).toEqual([1.975, 3.95, 1.975]);
  });

  it("boosts degenerate tiny shares to a watchable minimum", () => {
    const skewed: VideoPlan = {
      ...basePlan,
      scenes: [
        { ...basePlan.scenes[0], share: 0.01 },
        { ...basePlan.scenes[1], share: 0.98 },
        { ...basePlan.scenes[2], share: 0.01 },
      ],
    };
    const windows = planSceneWindows(skewed, 10);
    expect(windows.scenes[0].duration).toBeGreaterThanOrEqual(0.8);
    expect(windows.scenes[2].duration).toBeGreaterThanOrEqual(0.8);
    expect(windows.scenes[2].end).toBeCloseTo(windows.conclusion.start, 3);
  });

  it("slices scenes beyond the duration ceiling", () => {
    const crowded: VideoPlan = {
      ...basePlan,
      scenes: [
        ...basePlan.scenes,
        { id: "extra-1", role: "example", name: "Extra 1", goal: "Extra.", share: 0.1 },
        { id: "extra-2", role: "example", name: "Extra 2", goal: "Extra.", share: 0.1 },
      ],
    };
    expect(planSceneWindows(crowded, 5).scenes).toHaveLength(3);
    expect(planSceneWindows(crowded, 20).scenes).toHaveLength(5);
  });
});

describe("defaultVideoPlan", () => {
  it("produces a schema-valid two-scene plan", () => {
    const plan = defaultVideoPlan("How do solar panels work?");
    expect(VideoPlanSchema.parse(plan)).toBeTruthy();
    expect(plan.scenes.map((scene) => scene.role)).toEqual(["overview", "mechanism"]);
  });

  it("truncates long prompts into a bounded title", () => {
    const plan = defaultVideoPlan("Explain ".repeat(30).trim());
    expect(plan.title.length).toBeLessThanOrEqual(80);
    expect(VideoPlanSchema.parse(plan)).toBeTruthy();
  });
});

describe("planVideoScenes", () => {
  it("returns the parsed plan and normalizes duplicate or reserved scene ids", async () => {
    const callModel: VideoPartModelCaller = async () => ({
      ...basePlan,
      scenes: [
        { ...basePlan.scenes[0], id: "intro" },
        { ...basePlan.scenes[1], id: "cell" },
        { ...basePlan.scenes[2], id: "cell" },
      ],
    });
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );
    expect(plan.title).toBe("Solar Power");
    expect(plan.scenes.map((scene) => scene.id)).toEqual(["scene-intro", "cell", "cell-2"]);
  });

  it("repairs invalid planner output once", async () => {
    const userPrompts: string[] = [];
    let calls = 0;
    const callModel: VideoPartModelCaller = async (_systemPrompt, userPrompt) => {
      calls += 1;
      userPrompts.push(userPrompt as string);
      if (calls === 1) return { title: 42 };
      return basePlan;
    };
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );
    expect(plan.scenes).toHaveLength(3);
    expect(calls).toBe(2);
    expect(userPrompts[1]).toContain("did not match the required part schema");
  });

  it("falls back to the default plan when repair also fails", async () => {
    const callModel: VideoPartModelCaller = async () => ({ nope: true });
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );
    expect(plan.scenes.map((scene) => scene.id)).toEqual(["overview", "details"]);
  });

  it("falls back to the default plan on provider failure", async () => {
    let calls = 0;
    const callModel: VideoPartModelCaller = async () => {
      calls += 1;
      throw new Error("OpenRouter HTTP 500");
    };
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );
    expect(calls).toBe(1);
    expect(plan.scenes.map((scene) => scene.id)).toEqual(["overview", "details"]);
  });
});
