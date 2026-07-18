import { describe, expect, it } from "vitest";
import {
  defaultVideoPlan,
  planSceneWindows,
  planVideoScenes,
  VideoPlanSchema,
  type VideoPlan,
} from "@/lib/agent/rootGeneration/planner";
import type { RootGenerationModelCaller } from "@/lib/agent/rootGeneration/openrouter";
import {
  buildVideoPlannerSystemPrompt,
  buildVideoSceneSystemPrompt,
} from "@/lib/agent/rootGeneration/prompts";

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

  it("applies useful-duration floors before distributing remaining time by share", () => {
    const windows = planSceneWindows(basePlan, 15);
    expect(windows.scenes.map((window) => window.duration)).toEqual([2.925, 5.15, 4.225]);
  });

  it("distributes remaining time evenly when planner shares are equal", () => {
    const equalShares: VideoPlan = {
      ...basePlan,
      scenes: basePlan.scenes.map((scene) => ({ ...scene, share: 1 / 3 })),
    };
    const windows = planSceneWindows(equalShares, 15);

    expect(windows.scenes.map((window) => window.duration)).toEqual([3.233, 4.533, 4.534]);
  });

  it("treats highly skewed shares as preferences without fragmenting scenes", () => {
    const skewed: VideoPlan = {
      ...basePlan,
      scenes: [
        { ...basePlan.scenes[0], share: 0.01 },
        { ...basePlan.scenes[1], share: 0.98 },
        { ...basePlan.scenes[2], share: 0.01 },
      ],
    };
    const windows = planSceneWindows(skewed, 15);
    expect(windows.scenes[0].duration).toBeGreaterThanOrEqual(2);
    expect(windows.scenes[1].duration).toBeGreaterThanOrEqual(3.3);
    expect(windows.scenes[2].duration).toBeGreaterThanOrEqual(3.3);
    expect(windows.scenes[2].end).toBeCloseTo(windows.conclusion.start, 3);
  });

  it("removes an overview before the substantive scene in a five-second video", () => {
    const windows = planSceneWindows({
      ...basePlan,
      scenes: [basePlan.scenes[0], basePlan.scenes[1]],
    }, 5);

    expect(windows.scenes.map((window) => window.scene.role)).toEqual(["mechanism"]);
    expect(windows.scenes[0].duration).toBe(3.3);
  });

  it.each([5, 10, 15, 20] as const)(
    "keeps every substantive window useful at the %s-second rounding boundary",
    (duration) => {
      const windows = planSceneWindows(basePlan, duration);
      expect(windows.scenes.filter(({ scene }) => scene.role !== "overview"))
        .toEqual(expect.arrayContaining([
          expect.objectContaining({ duration: expect.any(Number) }),
        ]));
      for (const window of windows.scenes) {
        if (window.scene.role !== "overview") {
          expect(window.duration).toBeGreaterThanOrEqual(3.3);
        }
      }
      expect(windows.scenes.at(-1)?.end).toBe(windows.conclusion.start);
    },
  );

  it("preserves the substantive floor across accumulated millisecond rounding", () => {
    const roundingBoundary: VideoPlan = {
      ...basePlan,
      scenes: [
        { ...basePlan.scenes[1], id: "first", share: 0.3683471 },
        { ...basePlan.scenes[2], id: "second", share: 0.5025017 },
        { id: "third", role: "example", name: "Third", goal: "Third.", share: 0.1291448 },
        { ...basePlan.scenes[1], id: "last", share: 0.0000064 },
      ],
    };
    const windows = planSceneWindows(roundingBoundary, 20);

    expect(windows.scenes.map(({ duration }) => duration))
      .toEqual(expect.arrayContaining([
        expect.any(Number),
      ]));
    expect(Math.min(...windows.scenes.map(({ duration }) => duration))).toBeGreaterThanOrEqual(3.3);
    expect(windows.scenes.at(-1)?.end).toBe(windows.conclusion.start);
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
    expect(planSceneWindows(crowded, 5).scenes).toHaveLength(1);
    expect(planSceneWindows(crowded, 10).scenes).toHaveLength(2);
    expect(planSceneWindows(crowded, 15).scenes).toHaveLength(3);
    expect(planSceneWindows(crowded, 20).scenes).toHaveLength(4);
  });

  it("removes lower-share substantive scenes deterministically", () => {
    const crowded: VideoPlan = {
      ...basePlan,
      scenes: [
        { ...basePlan.scenes[1], id: "low", share: 0.1 },
        { ...basePlan.scenes[2], id: "high", share: 0.7 },
        { id: "medium", role: "example", name: "Worked", goal: "Show it.", share: 0.2 },
      ],
    };

    expect(planSceneWindows(crowded, 10).scenes.map(({ scene }) => scene.id))
      .toEqual(["high", "medium"]);
  });
});

describe("defaultVideoPlan", () => {
  it.each([
    [5, ["mechanism"]],
    [10, ["mechanism", "example"]],
    [15, ["mechanism", "example", "comparison"]],
    [20, ["mechanism", "example", "comparison", "mechanism"]],
  ] as const)("produces a schema-valid substantive fallback for %ss", (duration, roles) => {
    const plan = defaultVideoPlan("How do solar panels work?", duration);
    expect(VideoPlanSchema.parse(plan)).toBeTruthy();
    expect(plan.scenes.map((scene) => scene.role)).toEqual(roles);
  });

  it("truncates long prompts into a bounded title", () => {
    const plan = defaultVideoPlan("Explain ".repeat(30).trim(), 10);
    expect(plan.title.length).toBeLessThanOrEqual(80);
    expect(VideoPlanSchema.parse(plan)).toBeTruthy();
  });
});

describe("buildVideoPlannerSystemPrompt", () => {
  it("makes overview optional and gives five-second videos one substantive scene", () => {
    const prompt = buildVideoPlannerSystemPrompt(5);
    expect(prompt).toContain("exactly 1 content scene");
    expect(prompt).toContain("must be substantive");
    expect(prompt).toContain("Overview is optional");
  });

  it("permits two complementary substantive scenes at ten seconds", () => {
    const prompt = buildVideoPlannerSystemPrompt(10);
    expect(prompt).toContain("1 to 2 content scenes");
    expect(prompt).toContain("two complementary substantive scenes");
    expect(prompt).toContain("Every plan must include at least one substantive scene");
  });
});

describe("buildVideoSceneSystemPrompt", () => {
  const paletteAnchors = JSON.stringify({
    palette: "midnight",
    background: { from: "#07111f", to: "#10243d" },
    text: "#ffffff",
    primaryAccent: "#38bdf8",
  });

  it.each([
    ["mechanism", "underlying mechanism"],
    ["example", "concrete, specific instance"],
    ["comparison", "contrasts two or three alternatives"],
  ] as const)("focuses %s authorship on role-specific composition", (role, guidance) => {
    const scene = {
      ...basePlan.scenes[1],
      id: role,
      role,
      goal: `Author the ${role} scene.`,
    };
    const prompt = buildVideoSceneSystemPrompt(
      { ...basePlan, scenes: [basePlan.scenes[0], scene, basePlan.scenes[2]] },
      scene,
      4.125,
      paletteAnchors,
    );

    expect(prompt).toContain("VIDEO: Solar Power");
    expect(prompt).toContain(`SCENE ROLE: ${role}`);
    expect(prompt).toContain(`SCENE GOAL: Author the ${role} scene.`);
    expect(prompt).toContain("SEGMENT DURATION: 4.125s");
    expect(prompt).toContain(guidance);
    expect(prompt).toContain("subject-shaped geometry");
    expect(prompt).toContain("visible motion or staggered reveals");
    expect(prompt).toContain("readable label placement");
    expect(prompt).toContain("generic card rows");
  });

  it("includes only concise immediate-neighbor boundaries", () => {
    const prompt = buildVideoSceneSystemPrompt(
      basePlan,
      basePlan.scenes[1],
      5.15,
      paletteAnchors,
    );

    expect(prompt).toContain("PRECEDING BOUNDARY: At a glance (overview)");
    expect(prompt).toContain("FOLLOWING BOUNDARY: Panel types (comparison)");
    expect(prompt).not.toContain("OTHER SCENES");
    expect(prompt).not.toContain(basePlan.scenes[0].goal);
    expect(prompt).not.toContain(basePlan.scenes[2].goal);
  });

  it("handles an optional overview boundary without inventing a predecessor", () => {
    const prompt = buildVideoSceneSystemPrompt(
      basePlan,
      basePlan.scenes[0],
      2.5,
      paletteAnchors,
    );

    expect(prompt).toContain("PRECEDING BOUNDARY: video introduction");
    expect(prompt).toContain("FOLLOWING BOUNDARY: Inside the cell (mechanism)");
  });

  it("starts an overview-free substantive plan at the video introduction", () => {
    const scenes = [basePlan.scenes[1], basePlan.scenes[2]];
    const prompt = buildVideoSceneSystemPrompt(
      { ...basePlan, scenes },
      scenes[0],
      4.167,
      paletteAnchors,
    );

    expect(prompt).toContain("PRECEDING BOUNDARY: video introduction");
    expect(prompt).toContain("FOLLOWING BOUNDARY: Panel types (comparison)");
    expect(prompt).not.toContain("overview");
  });

  it("describes shared colors as anchors and permits semantic colors", () => {
    const prompt = buildVideoSceneSystemPrompt(
      basePlan,
      basePlan.scenes[1],
      5.15,
      paletteAnchors,
    );

    expect(prompt).toContain("PALETTE ANCHORS");
    expect(prompt).toContain("background, text, and primary-accent anchors");
    expect(prompt).toContain("not an exclusive color list");
    expect(prompt).toContain("subject-specific semantic colors");
  });
});

describe("planVideoScenes", () => {
  it("selects exactly one substantive content scene for a five-second video", async () => {
    const callModel: RootGenerationModelCaller = async () => basePlan;
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 5 },
      { callModel },
    );

    expect(plan.scenes).toHaveLength(1);
    expect(plan.scenes[0].role).not.toBe("overview");
  });

  it("returns the parsed plan and normalizes duplicate or reserved scene ids", async () => {
    const callModel: RootGenerationModelCaller = async () => ({
      ...basePlan,
      scenes: [
        { ...basePlan.scenes[0], id: "intro" },
        { ...basePlan.scenes[1], id: "cell" },
        { ...basePlan.scenes[2], id: "cell" },
      ],
    });
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 15 },
      { callModel },
    );
    expect(plan.title).toBe("Solar Power");
    expect(plan.scenes.map((scene) => scene.id)).toEqual(["scene-intro", "cell", "cell-2"]);
  });

  it("keeps normalized duplicate ids within the planner schema limit", async () => {
    const longId = "abcdefghijklmnopqrstuvwx";
    const callModel: RootGenerationModelCaller = async () => ({
      ...basePlan,
      scenes: [
        { ...basePlan.scenes[1], id: longId },
        { ...basePlan.scenes[2], id: longId },
      ],
    });
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );

    expect(plan.scenes.map((scene) => scene.id)).toEqual([
      longId,
      "abcdefghijklmnopqrstuv-2",
    ]);
    expect(VideoPlanSchema.parse(plan)).toBeTruthy();
  });

  it("repairs invalid planner output once", async () => {
    const userPrompts: string[] = [];
    let calls = 0;
    const callModel: RootGenerationModelCaller = async (_systemPrompt, userPrompt) => {
      calls += 1;
      userPrompts.push(userPrompt as string);
      if (calls === 1) return { title: 42 };
      return basePlan;
    };
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 15 },
      { callModel },
    );
    expect(plan.scenes).toHaveLength(3);
    expect(calls).toBe(2);
    expect(userPrompts[1]).toContain("did not match the required part schema");
  });

  it("does not accept overview as the only content scene", async () => {
    let calls = 0;
    const callModel: RootGenerationModelCaller = async () => {
      calls += 1;
      return calls === 1
        ? { ...basePlan, scenes: [basePlan.scenes[0]] }
        : { ...basePlan, scenes: [basePlan.scenes[1]] };
    };
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );

    expect(calls).toBe(2);
    expect(plan.scenes.map((scene) => scene.role)).toEqual(["mechanism"]);
  });

  it("falls back to the default plan when repair also fails", async () => {
    const callModel: RootGenerationModelCaller = async () => ({ nope: true });
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );
    expect(plan.scenes.map((scene) => scene.role)).toEqual(["mechanism", "example"]);
  });

  it("falls back to the default plan on provider failure", async () => {
    let calls = 0;
    const callModel: RootGenerationModelCaller = async () => {
      calls += 1;
      throw new Error("OpenRouter HTTP 500");
    };
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );
    expect(calls).toBe(1);
    expect(plan.scenes.map((scene) => scene.role)).toEqual(["mechanism", "example"]);
  });

  it("preserves an overview-free plan below the duration ceiling", async () => {
    const scenes = [
      { ...basePlan.scenes[1], id: "mechanism" },
      { ...basePlan.scenes[2], id: "comparison" },
    ];
    const callModel: RootGenerationModelCaller = async () => ({ ...basePlan, scenes });
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 20 },
      { callModel },
    );
    expect(plan.scenes).toEqual(scenes);
  });

  it("drops an overview before substantive scenes from an over-limit response", async () => {
    const callModel: RootGenerationModelCaller = async () => ({
      ...basePlan,
      scenes: [
        basePlan.scenes[0],
        basePlan.scenes[1],
        basePlan.scenes[2],
        { id: "worked", role: "example", name: "Worked example", goal: "Show the numbers.", share: 0.2 },
      ],
    });
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );
    expect(plan.scenes.map((scene) => scene.role)).toEqual(["mechanism", "comparison"]);
  });

  it("keeps at most one overview and places it before substantive scenes", async () => {
    const callModel: RootGenerationModelCaller = async () => ({
      ...basePlan,
      scenes: [
        basePlan.scenes[1],
        basePlan.scenes[0],
        { ...basePlan.scenes[0], id: "second-overview" },
        basePlan.scenes[2],
      ],
    });
    const plan = await planVideoScenes(
      { prompt: "How does solar power work?", duration: 20 },
      { callModel },
    );

    expect(plan.scenes.map((scene) => scene.role)).toEqual([
      "overview",
      "mechanism",
      "comparison",
    ]);
  });
});
