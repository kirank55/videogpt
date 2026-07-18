import { describe, expect, it } from "vitest";
import { getVideoPartBudget } from "@/lib/agent/rootGeneration/budgets";
import {
  OpenRouterJsonParseError,
  OpenRouterLengthError,
} from "@/lib/agent/rootGeneration/openrouter";
import { buildVideoSceneSystemPrompt } from "@/lib/agent/rootGeneration/prompts";
import type { VideoPlan, VideoScene } from "@/lib/agent/rootGeneration/planner";
import { generateVideoScene } from "@/lib/agent/rootGeneration/scenes";

const plan: VideoPlan = {
  title: "Solar power",
  closingLine: "Separated charge becomes useful current.",
  logline: "How a solar cell turns light into electricity.",
  scenes: [],
};

function scene(role: VideoScene["role"]): VideoScene {
  return {
    id: role,
    role,
    name: role,
    goal: `Explain the ${role}.`,
    share: 1,
  };
}

function authoredEvents(count: number, duration: number) {
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
      text: "Charge separation",
      x: 160,
      y: 100,
      maxWidth: 1_500,
      color: "#ffffff",
      fontSize: 40,
      fontWeight: 800,
      backdrop: { fill: "#07111f", paddingX: 20, paddingY: 12 },
    },
    ...Array.from({ length: Math.max(0, count - 2) }, (_, index) => ({
      id: `shape-${index + 1}`,
      type: "shape" as const,
      shapeType: "circle" as const,
      start: Math.min(duration - 0.1, 0.05 * (index + 1)),
      end: duration,
      layer: 2,
      x: 220 + (index % 6) * 250,
      y: 300 + Math.floor(index / 6) * 220,
      radius: 60,
      fill: "#2563eb",
      opacity: { from: 0, to: 1, easing: "easeOut" as const },
    })),
  ];
}

describe("root scene generation", () => {
  it("gives a 3.3-second substantive scene the root capacity floor while keeping overview compact", () => {
    expect(getVideoPartBudget("main-diagram", 3.3)).toEqual({
      maxTokens: 6_144,
      maxEvents: 20,
    });
    expect(getVideoPartBudget("summary", 3.3)).toEqual({
      maxTokens: 2_048,
      maxEvents: 10,
    });

    const substantivePrompt = buildVideoSceneSystemPrompt(
      { ...plan, scenes: [scene("mechanism")] },
      scene("mechanism"),
      3.3,
    );
    const overviewPrompt = buildVideoSceneSystemPrompt(
      { ...plan, scenes: [scene("overview")] },
      scene("overview"),
      3.3,
    );

    expect(substantivePrompt).toContain("Use at most 20 events.");
    expect(overviewPrompt).toContain("Use at most 10 events.");
  });

  it("keeps the substantive floor at the former boundary and preserves longer-scene scaling", () => {
    expect(getVideoPartBudget("main-diagram", 4)).toEqual({
      maxTokens: 6_144,
      maxEvents: 20,
    });
    expect(getVideoPartBudget("main-diagram", 10)).toEqual({
      maxTokens: 6_144,
      maxEvents: 20,
    });
    expect(getVideoPartBudget("main-diagram", 10.1)).toEqual({
      maxTokens: 8_192,
      maxEvents: 28,
    });
  });

  it.each([
    { authoredCount: 20, retainedCount: 20 },
    { authoredCount: 21, retainedCount: 20 },
  ])(
    "retains $retainedCount events from a $authoredCount-event short substantive response",
    async ({ authoredCount, retainedCount }) => {
      const mechanism = scene("mechanism");
      const optionsSeen: Array<{ maxTokens?: number }> = [];
      const generated = await generateVideoScene(
        {
          plan: { ...plan, scenes: [mechanism] },
          scene: mechanism,
          prompt: "How does solar power work?",
          duration: 3.3,
        },
        {
          callModel: async (_systemPrompt, _userPrompt, options = {}) => {
            optionsSeen.push(options);
            return {
              mode: "direct-timeline",
              name: "Charge separation",
              visualIntent: "Show charges moving through the cell.",
              events: authoredEvents(authoredCount, 3.3),
            };
          },
        },
      );

      expect(optionsSeen).toEqual([expect.objectContaining({ maxTokens: 6_144 })]);
      expect(generated.content.events).toHaveLength(retainedCount);
      expect(generated.content.events.at(-1)?.id).toBe(`shape-${retainedCount - 2}`);
    },
  );

  it("repairs malformed substantive output once with the original brief and partial output", async () => {
    const mechanism = scene("mechanism");
    const calls: Array<{
      userPrompt: string;
      options: { maxTokens?: number; temperature?: number };
    }> = [];
    const generated = await generateVideoScene(
      {
        plan: { ...plan, scenes: [mechanism] },
        scene: mechanism,
        prompt: "How does solar power work?",
        duration: 3.3,
      },
      {
        callModel: async (_systemPrompt, userPrompt, options = {}) => {
          calls.push({ userPrompt, options });
          if (calls.length === 1) {
            throw new OpenRouterJsonParseError(
              '{"mode":"direct-timeline","events":[{"id":"partial"',
              "length",
            );
          }
          return {
            mode: "direct-timeline",
            name: "Charge separation",
            visualIntent: "Show charges moving through the cell.",
            events: authoredEvents(20, 3.3),
          };
        },
      },
    );

    expect(calls).toHaveLength(2);
    expect(calls[1].options).toEqual(expect.objectContaining({
      maxTokens: 6_144,
      temperature: 0.2,
    }));
    expect(calls[1].userPrompt).toContain("SCENE GOAL: Explain the mechanism.");
    expect(calls[1].userPrompt).toContain("OpenRouter content is not valid JSON");
    expect(calls[1].userPrompt).toContain('{"mode":"direct-timeline","events"');
    expect(generated.content.events).toHaveLength(20);
  });

  it("repairs an effectively empty substantive timeline once", async () => {
    const mechanism = scene("mechanism");
    const userPrompts: string[] = [];
    const generated = await generateVideoScene(
      {
        plan: { ...plan, scenes: [mechanism] },
        scene: mechanism,
        prompt: "How does solar power work?",
        duration: 3.3,
      },
      {
        callModel: async (_systemPrompt, userPrompt) => {
          userPrompts.push(userPrompt);
          if (userPrompts.length === 1) {
            return {
              mode: "direct-timeline",
              name: "Empty",
              visualIntent: "No usable visual content.",
              events: [],
            };
          }
          return {
            mode: "direct-timeline",
            name: "Charge separation",
            visualIntent: "Show charges moving through the cell.",
            events: authoredEvents(20, 3.3),
          };
        },
      },
    );

    expect(userPrompts).toHaveLength(2);
    expect(userPrompts[1]).toContain("effectively empty");
    expect(userPrompts[1]).toContain('"events":[]');
    expect(generated.content.events).toHaveLength(20);
  });

  it("repairs length-truncated substantive output once", async () => {
    const mechanism = scene("mechanism");
    let calls = 0;
    const generated = await generateVideoScene(
      {
        plan: { ...plan, scenes: [mechanism] },
        scene: mechanism,
        prompt: "How does solar power work?",
        duration: 3.3,
      },
      {
        callModel: async () => {
          calls += 1;
          if (calls === 1) throw new OpenRouterLengthError();
          return {
            mode: "direct-timeline",
            name: "Charge separation",
            visualIntent: "Show charges moving through the cell.",
            events: authoredEvents(20, 3.3),
          };
        },
      },
    );

    expect(calls).toBe(2);
    expect(generated.content.events).toHaveLength(20);
  });

  it("normalizes recoverable substantive output without spending a repair call", async () => {
    const mechanism = scene("mechanism");
    let calls = 0;
    const generated = await generateVideoScene(
      {
        plan: { ...plan, scenes: [mechanism] },
        scene: mechanism,
        prompt: "How does solar power work?",
        duration: 3.3,
      },
      {
        callModel: async () => {
          calls += 1;
          return {
            mode: "direct-timeline",
            name: "Charge separation",
            visualIntent: "Recover the authored geometry.",
            events: authoredEvents(6, 3.3).map((event) =>
              event.id === "shape-1" ? { ...event, x: 4_000, start: -2, end: 20 } : event
            ),
          };
        },
      },
    );

    expect(calls).toBe(1);
    expect(generated.content.events.find((event) => event.id === "shape-1")).toMatchObject({
      start: 0,
      end: 3.3,
    });
  });

  it("falls back after one unusable repair and exposes a degraded-scene diagnostic", async () => {
    const mechanism = scene("mechanism");
    let calls = 0;
    const generated = await generateVideoScene(
      {
        plan: { ...plan, scenes: [mechanism] },
        scene: mechanism,
        prompt: "How does solar power work?",
        duration: 3.3,
      },
      {
        callModel: async () => {
          calls += 1;
          return {
            mode: "direct-timeline",
            name: "Empty",
            visualIntent: "No usable visual content.",
            events: [],
          };
        },
      },
    );

    expect(calls).toBe(2);
    expect(generated.diagnostics).toEqual([
      expect.objectContaining({
        code: "degraded-scene",
        repairAttempted: true,
      }),
    ]);
    expect(generated.content.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "background-fallback", type: "background" }),
      expect.objectContaining({ id: "label-fallback", type: "text" }),
      expect.objectContaining({ id: "shape-fallback-1", type: "shape" }),
    ]));
  });

  it("treats unsupported object-shaped events as effectively empty", async () => {
    const mechanism = scene("mechanism");
    let calls = 0;
    const generated = await generateVideoScene(
      {
        plan: { ...plan, scenes: [mechanism] },
        scene: mechanism,
        prompt: "How does solar power work?",
        duration: 3.3,
      },
      {
        callModel: async () => {
          calls += 1;
          return {
            mode: "direct-timeline",
            name: "Empty",
            visualIntent: "No usable visual content.",
            events: [{}],
          };
        },
      },
    );

    expect(calls).toBe(2);
    expect(generated.diagnostics).toEqual([
      expect.objectContaining({ code: "degraded-scene" }),
    ]);
  });

  it("keeps overview generation compact and single-shot when output is malformed", async () => {
    const overview = scene("overview");
    let calls = 0;
    const generated = await generateVideoScene(
      {
        plan: { ...plan, scenes: [overview] },
        scene: overview,
        prompt: "How does solar power work?",
        duration: 3.3,
      },
      {
        callModel: async () => {
          calls += 1;
          throw new OpenRouterJsonParseError("{ malformed", "length");
        },
      },
    );

    expect(calls).toBe(1);
    expect(generated.diagnostics).toEqual([]);
    expect(generated.content.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "background-fallback", type: "background" }),
      expect.objectContaining({ id: "label-fallback", type: "text" }),
    ]));
  });
});
