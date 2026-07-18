import { describe, expect, it } from "vitest";
import {
  generateComposedVideo,
  type ComposedVideoModelCaller,
} from "@/lib/agent/rootGeneration/composedVideo";
import { planSceneWindows, type VideoPlan } from "@/lib/agent/rootGeneration/planner";

function localDuration(systemPrompt: string): number {
  const match = systemPrompt.match(/SEGMENT DURATION: ([\d.]+)s/);
  if (!match) throw new Error(`Missing segment duration in prompt: ${systemPrompt}`);
  return Number(match[1]);
}

function directEvents(duration: number, compact: boolean) {
  return [
    {
      id: "background",
      type: "background" as const,
      start: 0,
      end: duration,
      layer: 0,
      background: { kind: "solid" as const, color: "#07111f" },
    },
    {
      id: "heading",
      type: "text" as const,
      start: 0,
      end: duration,
      layer: 8,
      text: compact ? "Solar power at a glance" : "Charge separation",
      x: 160,
      y: 100,
      maxWidth: 1500,
      color: "#ffffff",
      fontSize: 40,
      fontWeight: 800,
    },
    {
      id: "left-shape",
      type: "shape" as const,
      shapeType: "rect" as const,
      start: 0.1,
      end: duration,
      layer: 2,
      x: 280,
      y: 360,
      width: 420,
      height: 260,
      fill: "#2563eb",
      opacity: { from: 0, to: 1, easing: "easeOut" as const },
      translateX: {
        keyframes: [
          { time: 0.1, value: -20, easing: "easeOut" as const },
          { time: Math.max(0.2, duration - 0.1), value: 0, easing: "easeOut" as const },
        ],
      },
    },
    {
      id: "right-shape",
      type: "shape" as const,
      shapeType: "circle" as const,
      start: 0.25,
      end: duration,
      layer: 2,
      x: 1250,
      y: 490,
      radius: 140,
      fill: "#f59e0b",
    },
    ...(!compact
      ? [{
          id: "mechanism-arrow",
          type: "shape" as const,
          shapeType: "line" as const,
          start: 0.4,
          end: duration,
          layer: 4,
          x1: 720,
          y1: 490,
          x2: 1080,
          y2: 490,
          stroke: "#ffffff",
          lineWidth: 8,
          arrowEnd: true,
          drawProgress: { from: 0, to: 1, easing: "easeInOut" as const },
        }]
      : []),
  ];
}

const plan: VideoPlan = {
  title: "Solar Power",
  subtitle: "From light to electricity",
  closingLine: "Separated charge becomes useful current.",
  logline: "How solar cells turn sunlight into current.",
  scenes: [
    { id: "overview", role: "overview", name: "At a glance", goal: "Introduce the cell.", share: 0.25 },
    { id: "cell", role: "mechanism", name: "Inside the cell", goal: "Charge separation.", share: 0.5 },
    { id: "panels", role: "comparison", name: "Panel types", goal: "Compare cell types.", share: 0.25 },
  ],
};

function sceneIdOf(systemPrompt: string): string {
  return systemPrompt.match(/SCENE: ([^\n]+)/)?.[1]?.trim() ?? "unknown";
}

describe("composed video generation", () => {
  it("plans first, generates scenes concurrently, and composes one bounded project", async () => {
    const started: string[] = [];
    const initialRequests: Array<{ part: string; userPrompt: string; systemPrompt: string }> = [];
    const phases: string[] = [];
    let planned: VideoPlan | undefined;
    let release!: () => void;
    const allScenesStarted = new Promise<void>((resolve) => {
      release = resolve;
    });

    const callModel: ComposedVideoModelCaller = async (systemPrompt, userPrompt) => {
      if (systemPrompt.includes("PART: planner")) {
        started.push("plan");
        initialRequests.push({ part: "plan", userPrompt, systemPrompt });
        return plan;
      }
      const sceneId = sceneIdOf(systemPrompt);
      started.push(sceneId);
      initialRequests.push({ part: sceneId, userPrompt, systemPrompt });
      if (started.filter((part) => part !== "plan").length === plan.scenes.length) release();
      await allScenesStarted;

      const duration = localDuration(systemPrompt);
      const compact = systemPrompt.includes("SCENE ROLE: overview");
      return {
        mode: compact ? "direct-summary-timeline" : "direct-timeline",
        name: compact ? "Solar power at a glance" : "Charge separation",
        visualIntent: "Scene visuals.",
        events: directEvents(duration, compact),
      };
    };

    const result = await generateComposedVideo(
      { prompt: "How does solar power work?", duration: 15 },
      {
        callModel,
        onPhase: (phase) => phases.push(phase),
        onPlan: (value) => {
          planned = value;
        },
      },
    );

    expect(started[0]).toBe("plan");
    expect(started.slice(1).sort()).toEqual(["cell", "overview", "panels"]);
    expect(initialRequests.every(({ userPrompt }) => userPrompt === "How does solar power work?")).toBe(true);
    expect(planned?.title).toBe("Solar Power");
    expect(phases).toEqual(["planning", "generating-sections", "composing"]);

    const visualContextOf = (part: string) =>
      initialRequests.find((request) => request.part === part)
        ?.systemPrompt.match(/PALETTE ANCHORS: (.+)/)?.[1];
    expect(visualContextOf("plan")).toBeUndefined();
    expect(visualContextOf("overview")).toBe(visualContextOf("cell"));
    expect(visualContextOf("overview")).toContain('"palette"');
    const cellPrompt = initialRequests.find(({ part }) => part === "cell")!.systemPrompt;
    expect(cellPrompt).toContain("PRECEDING BOUNDARY: At a glance (overview)");
    expect(cellPrompt).toContain("FOLLOWING BOUNDARY: Panel types (comparison)");
    expect(cellPrompt).not.toContain(plan.scenes[0].goal);
    expect(cellPrompt).not.toContain(plan.scenes[2].goal);

    const windows = planSceneWindows(plan, 15);
    for (const window of windows.scenes) {
      expect(localDuration(
        initialRequests.find(({ part }) => part === window.scene.id)!.systemPrompt,
      )).toBe(window.duration);
    }

    expect(result.projectName).toBe("Solar Power");
    expect(result.summary).toBe("How solar cells turn sunlight into current.");
    expect(result.project.duration).toBe(15);
    expect(result.project.events.every((event) => event.start >= 0 && event.end <= 15)).toBe(true);
    expect(new Set(result.project.events.map((event) => event.id)).size).toBe(result.project.events.length);
    expect(result.project.events.some((event) => event.id.startsWith("intro-"))).toBe(true);
    expect(result.project.events.some((event) => event.id.startsWith("overview-"))).toBe(true);
    expect(result.project.events.some((event) => event.id.startsWith("cell-"))).toBe(true);
    expect(result.project.events.some((event) => event.id.startsWith("panels-"))).toBe(true);
    expect(result.project.events.some((event) => event.id.startsWith("conclusion-"))).toBe(true);

    expect(result.project.chapters).toEqual([
      { name: "Introduction", time: 0 },
      { name: "At a glance", time: windows.scenes[0].start },
      { name: "Inside the cell", time: windows.scenes[1].start },
      { name: "Panel types", time: windows.scenes[2].start },
      { name: "Conclusion", time: windows.conclusion.start },
    ]);

    const shiftedSceneShape = result.project.events.find(
      (event) => event.id === "cell-left-shape",
    );
    expect(shiftedSceneShape?.start).toBeCloseTo(windows.scenes[1].start + 0.1);
    if (!shiftedSceneShape?.translateX || !("keyframes" in shiftedSceneShape.translateX)) {
      throw new Error("Expected shifted scene keyframes");
    }
    expect(shiftedSceneShape.translateX.keyframes[0].time).toBeCloseTo(
      windows.scenes[1].start + 0.1,
    );
  });

  it("falls back to the default plan when the planner cannot complete", async () => {
    let plannerCalls = 0;
    const callModel: ComposedVideoModelCaller = async (systemPrompt) => {
      if (systemPrompt.includes("PART: planner")) {
        plannerCalls += 1;
        throw new Error("OpenRouter HTTP 500");
      }
      const duration = localDuration(systemPrompt);
      const compact = systemPrompt.includes("SCENE ROLE: overview");
      return {
        mode: compact ? "direct-summary-timeline" : "direct-timeline",
        name: "Scene",
        visualIntent: "Scene visuals.",
        events: directEvents(duration, compact),
      };
    };

    const result = await generateComposedVideo(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );
    expect(plannerCalls).toBe(1);
    expect(result.scenes.map((scene) => scene.scene.id)).toEqual(["mechanism", "worked-example"]);
    expect(result.project.events.some((event) => event.id.startsWith("mechanism-"))).toBe(true);
    expect(result.project.events.some((event) => event.id.startsWith("worked-example-"))).toBe(true);
  });

  it.each([5, 10, 15, 20] as const)(
    "preserves a %s-second duration with background coverage across every interval",
    async (duration) => {
      const callModel: ComposedVideoModelCaller = async (systemPrompt) => {
        if (systemPrompt.includes("PART: planner")) return plan;
        const sceneDuration = localDuration(systemPrompt);
        const compact = systemPrompt.includes("SCENE ROLE: overview");
        return {
          mode: compact ? "direct-summary-timeline" : "direct-timeline",
          name: "Scene",
          visualIntent: "Scene visuals.",
          events: directEvents(sceneDuration, compact),
        };
      };

      const result = await generateComposedVideo(
        { prompt: "How does solar power work?", duration },
        { callModel },
      );
      const backgrounds = result.project.events
        .filter((event) => event.type === "background")
        .sort((first, second) => first.start - second.start);

      expect(result.project.duration).toBe(duration);
      expect(backgrounds[0].start).toBe(0);
      expect(backgrounds.at(-1)?.end).toBe(duration);
      backgrounds.forEach((event, index) => {
        const next = backgrounds[index + 1];
        if (next) expect(event.end).toBe(next.start);
      });
    },
  );

  it("composes renderer-safe fallbacks for an empty authored scene", async () => {
    const callModel: ComposedVideoModelCaller = async (systemPrompt) => {
      if (systemPrompt.includes("PART: planner")) return plan;
      const duration = localDuration(systemPrompt);
      if (systemPrompt.includes("SCENE: cell")) {
        return { mode: "direct-timeline", name: "Broken", visualIntent: "Broken", events: [] };
      }
      const compact = systemPrompt.includes("SCENE ROLE: overview");
      return {
        mode: compact ? "direct-summary-timeline" : "direct-timeline",
        name: "Scene",
        visualIntent: "Scene visuals.",
        events: directEvents(duration, compact),
      };
    };

    const result = await generateComposedVideo(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );
    const cellScene = result.scenes.find((scene) => scene.scene.id === "cell");
    expect(cellScene?.content.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "background-fallback", type: "background" }),
      expect.objectContaining({ id: "label-fallback", type: "text" }),
      expect.objectContaining({ id: "shape-fallback-1", type: "shape" }),
    ]));
    expect(result.project.events.some((event) => event.id === "cell-background-fallback")).toBe(true);
  });

  it("composes a repaired substantive scene in its original window without retrying other scenes", async () => {
    const sceneCalls = new Map<string, number>();
    const callModel: ComposedVideoModelCaller = async (systemPrompt) => {
      if (systemPrompt.includes("PART: planner")) return plan;
      const sceneId = sceneIdOf(systemPrompt);
      sceneCalls.set(sceneId, (sceneCalls.get(sceneId) ?? 0) + 1);
      const duration = localDuration(systemPrompt);
      if (sceneId === "cell" && sceneCalls.get(sceneId) === 1) {
        return {
          mode: "direct-timeline",
          name: "Empty",
          visualIntent: "No usable visual content.",
          events: [],
        };
      }
      const compact = systemPrompt.includes("SCENE ROLE: overview");
      return {
        mode: compact ? "direct-summary-timeline" : "direct-timeline",
        name: "Scene",
        visualIntent: "Scene visuals.",
        events: directEvents(duration, compact),
      };
    };

    const result = await generateComposedVideo(
      { prompt: "How does solar power work?", duration: 15 },
      { callModel },
    );
    const windows = planSceneWindows(result.plan, 15);
    const cellWindow = windows.scenes.find((window) => window.scene.id === "cell")!;
    const cellEvents = result.project.events.filter((event) => event.id.startsWith("cell-"));

    expect(sceneCalls).toEqual(new Map([
      ["overview", 1],
      ["cell", 2],
      ["panels", 1],
    ]));
    expect(cellEvents.every((event) =>
      event.start >= cellWindow.start && event.end <= cellWindow.end
    )).toBe(true);
    expect(result.scenes.find((generated) => generated.scene.id === "cell")?.diagnostics).toEqual([]);
    expect(result.project.events.some((event) => event.id.startsWith("overview-"))).toBe(true);
    expect(result.project.events.some((event) => event.id.startsWith("panels-"))).toBe(true);
  });

  it("rejects when a scene generation fails hard", async () => {
    const callModel: ComposedVideoModelCaller = async (systemPrompt) => {
      if (systemPrompt.includes("PART: planner")) return plan;
      if (systemPrompt.includes("SCENE: cell")) throw new Error("OpenRouter HTTP 500");
      const duration = localDuration(systemPrompt);
      const compact = systemPrompt.includes("SCENE ROLE: overview");
      return {
        mode: compact ? "direct-summary-timeline" : "direct-timeline",
        name: "Scene",
        visualIntent: "Scene visuals.",
        events: directEvents(duration, compact),
      };
    };

    await expect(generateComposedVideo(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    )).rejects.toThrow("cell generation failed");
  });
});
