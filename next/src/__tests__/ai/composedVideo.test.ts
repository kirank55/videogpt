import { describe, expect, it } from "vitest";
import {
  generateComposedVideo,
  planCompositionWindows,
  type ComposedVideoModelCaller,
} from "@/lib/agent/videoParts/composedVideo";

function localDuration(systemPrompt: string): number {
  const match = systemPrompt.match(/SEGMENT DURATION: ([\d.]+)s/);
  if (!match) throw new Error(`Missing segment duration in prompt: ${systemPrompt}`);
  return Number(match[1]);
}

function directEvents(duration: number, summary: boolean) {
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
      text: summary ? "Solar power at a glance" : "Charge separation",
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
    ...(!summary
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

describe("composed video generation", () => {
  it.each([
    [5, 0.85],
    [10, 1.05],
    [15, 1.35],
    [20, 1.5],
  ] as const)("plans contiguous windows for %ss", (duration, bookend) => {
    const windows = planCompositionWindows(duration);
    expect(windows.intro).toEqual({ start: 0, end: bookend, duration: bookend });
    expect(windows.intro.end).toBe(windows.summary.start);
    expect(windows.summary.end).toBe(windows.main.start);
    expect(windows.main.end).toBe(windows.conclusion.start);
    expect(windows.conclusion.end).toBe(duration);
    expect(windows.summary.duration).toBeGreaterThanOrEqual(1);
    expect(windows.summary.duration).toBeLessThanOrEqual(4);
  });

  it("starts exactly three authored groups concurrently and composes one bounded project", async () => {
    const started: string[] = [];
    const initialRequests: Array<{
      part: string;
      userPrompt: string;
      systemPrompt: string;
    }> = [];
    let release!: () => void;
    const allStarted = new Promise<void>((resolve) => {
      release = resolve;
    });

    const callModel: ComposedVideoModelCaller = async (systemPrompt, userPrompt) => {
      const part = systemPrompt.match(/PART: ([^\n]+)/)?.[1]?.trim() ?? "unknown";
      started.push(part);
      initialRequests.push({ part, userPrompt, systemPrompt });
      if (started.length === 3) release();
      await allStarted;

      if (part === "bookends") {
        return {
          title: "Solar Power",
          subtitle: "From light to electricity",
          closingLine: "Separated charge becomes useful current.",
        };
      }
      const duration = localDuration(systemPrompt);
      if (part === "summary") {
        return {
          mode: "direct-summary-timeline",
          name: "Solar power at a glance",
          visualIntent: "Introduce the cell, sunlight, and current as one compact overview.",
          events: directEvents(duration, true),
        };
      }
      return {
        mode: "direct-timeline",
        name: "Charge separation inside the cell",
        visualIntent: "Show the field moving electrons and holes apart.",
        events: directEvents(duration, false),
      };
    };

    const result = await generateComposedVideo(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );

    expect(started.sort()).toEqual(["bookends", "main-diagram", "summary"]);
    expect(initialRequests.every(({ userPrompt }) => userPrompt === "How does solar power work?")).toBe(true);
    const visualContextOf = (part: string) =>
      initialRequests.find((request) => request.part === part)
        ?.systemPrompt.match(/VISUAL CONTEXT: (.+)/)?.[1];
    expect(visualContextOf("bookends")).toBeUndefined();
    expect(visualContextOf("summary")).toBe(visualContextOf("main-diagram"));
    expect(visualContextOf("summary")).toContain('"palette"');
    const windowsForRequest = planCompositionWindows(10);
    expect(localDuration(
      initialRequests.find(({ part }) => part === "summary")!.systemPrompt,
    )).toBe(windowsForRequest.summary.duration);
    expect(localDuration(
      initialRequests.find(({ part }) => part === "main-diagram")!.systemPrompt,
    )).toBe(windowsForRequest.main.duration);
    expect(result.projectName).toBe("Solar Power");
    expect(result.summary).toBe("Solar power at a glance");
    expect(result.project.duration).toBe(10);
    expect(result.project.events.every((event) => event.start >= 0 && event.end <= 10)).toBe(true);
    expect(new Set(result.project.events.map((event) => event.id)).size).toBe(result.project.events.length);
    expect(result.project.events.some((event) => event.id.startsWith("intro-"))).toBe(true);
    expect(result.project.events.some((event) => event.id.startsWith("summary-"))).toBe(true);
    expect(result.project.events.some((event) => event.id.startsWith("main-"))).toBe(true);
    expect(result.project.events.some((event) => event.id.startsWith("conclusion-"))).toBe(true);

    const windows = planCompositionWindows(10);
    const shiftedSummaryShape = result.project.events.find(
      (event) => event.id === "summary-left-shape",
    );
    expect(shiftedSummaryShape?.start).toBeCloseTo(windows.summary.start + 0.1);
    if (!shiftedSummaryShape?.translateX || !("keyframes" in shiftedSummaryShape.translateX)) {
      throw new Error("Expected shifted summary keyframes");
    }
    expect(shiftedSummaryShape.translateX.keyframes[0].time).toBeCloseTo(
      windows.summary.start + 0.1,
    );
  });

  it("composes a renderer-safe fallback for an empty authored section", async () => {
    const calls: string[] = [];
    const callModel: ComposedVideoModelCaller = async (systemPrompt) => {
      const part = systemPrompt.match(/PART: ([^\n]+)/)?.[1]?.trim() ?? "unknown";
      calls.push(part);
      if (part === "bookends") {
        return { title: "Solar Power", closingLine: "Done." };
      }
      const duration = localDuration(systemPrompt);
      if (part === "summary") {
        return {
          mode: "direct-summary-timeline",
          name: "Overview",
          visualIntent: "A compact overview.",
          events: directEvents(duration, true),
        };
      }
      return { mode: "direct-timeline", name: "Broken", visualIntent: "Broken", events: [] };
    };

    const result = await generateComposedVideo(
      { prompt: "How does solar power work?", duration: 10 },
      { callModel },
    );
    expect(result.parts.mainDiagram.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "background-fallback", type: "background" }),
      expect.objectContaining({ id: "label-fallback", type: "text" }),
      expect.objectContaining({ id: "shape-fallback-1", type: "shape" }),
    ]));
    expect(calls.filter((part) => part === "main-diagram")).toHaveLength(1);
  });

  it("repairs malformed bookend JSON once using the rejected content", async () => {
    let bookendCalls = 0;
    const userPrompts: string[] = [];
    const callModel: ComposedVideoModelCaller = async (systemPrompt, userPrompt) => {
      const part = systemPrompt.match(/PART: ([^\n]+)/)?.[1]?.trim() ?? "unknown";
      if (part === "bookends") {
        bookendCalls += 1;
        userPrompts.push(userPrompt);
        if (bookendCalls === 1) {
          const error = new Error("malformed JSON") as Error & { content: string };
          error.name = "OpenRouterJsonParseError";
          error.content = '{"title":"Solar Power"';
          throw error;
        }
        return { title: "Solar Power", closingLine: "Done." };
      }
      const duration = localDuration(systemPrompt);
      return part === "summary"
        ? {
            mode: "direct-summary-timeline",
            name: "Overview",
            visualIntent: "Compact overview.",
            events: directEvents(duration, true),
          }
        : {
            mode: "direct-timeline",
            name: "Mechanism",
            visualIntent: "Detailed mechanism.",
            events: directEvents(duration, false),
          };
    };

    await expect(generateComposedVideo(
      { prompt: "Explain solar power", duration: 10 },
      { callModel },
    )).resolves.toMatchObject({ projectName: "Solar Power" });
    expect(bookendCalls).toBe(2);
    expect(userPrompts[1]).toContain('{"title":"Solar Power"');
  });
});
